import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useLanguage } from "../LanguageContext";
import { API_BASE_URL, TIER_LIMITS } from "../config/constants";
import { startSession, endSession, getSessionLogId } from "../utils/sessionManager";
import { MicIcon } from "./icons";
import { ChatBubble } from "./ChatBubble";
import { ListeningView } from "./ListeningView";

export function TalkView({ subtleText, cardTheme, fontSizes, onSaveTranscription, selectedTopic }) {
  const [speaking, setSpeaking] = useState(false);
  const [userTier, setUserTier] = useState('free');
  const [usageRemaining, setUsageRemaining] = useState(5);
  const [limitReached, setLimitReached] = useState(false);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const conversationStartTimeRef = useRef(null);
  const [connectingToBackend, setConnectingToBackend] = useState(false);
  const { t } = useLanguage();

  const getInitialMessage = () => {
    if (selectedTopic) {
      return `Great choice! Let's talk about "${selectedTopic.title}". ${selectedTopic.description}. I'll start us off - are you ready?`;
    }
    return "Hello! When you're ready, tap the big green button to start talking.";
  };

  const [conversation, setConversation] = useState([
    { role: "bot", text: getInitialMessage() },
  ]);

  const mediaStreamRef = useRef(null);
  const webSocketRef = useRef(null);
  const audioContextRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const isBotSpeakingRef = useRef(false);
  const currentResponseTextRef = useRef('');
  const [liveTranscript, setLiveTranscript] = useState("");
  const hasAutoStartedRef = useRef(false);
  const nextPlayTimeRef = useRef(0);
  const autoStartRequestedRef = useRef(false);
  const audioChunkCountRef = useRef(0);
  const conversationRef = useRef([]);
  const sessionReadyRef = useRef(false);

  const updateConversation = (updater) => {
    setConversation(prev => {
      const newConversation = typeof updater === 'function' ? updater(prev) : updater;
      conversationRef.current = newConversation;
      return newConversation;
    });
  };

  useEffect(() => {
    loadUsageInfo();
  }, []);

  const loadUsageInfo = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, monthly_voice_minutes_used, premium_until, is_admin')
      .eq('id', user.id)
      .single();

    if (!profile) {
      setLoadingUsage(false);
      return;
    }

    if (profile.is_admin) {
      setIsAdmin(true);
      setUserTier('enterprise');
      setUsageRemaining(-1);
      setLimitReached(false);
      setLoadingUsage(false);
      return;
    }

    let currentTier = profile.tier || 'free';
    if (currentTier === 'premium' && profile.premium_until) {
      if (new Date(profile.premium_until) < new Date()) {
        currentTier = 'free';
        await supabase
          .from('profiles')
          .update({ tier: 'free' })
          .eq('id', user.id);
      }
    }

    setUserTier(currentTier);

    const used = profile.monthly_voice_minutes_used || 0;
    const limit = TIER_LIMITS[currentTier].monthlyMinutes;

    if (limit === -1) {
      setUsageRemaining(-1);
      setLimitReached(false);
    } else {
      const remaining = Math.max(0, limit - used);
      setUsageRemaining(remaining);
      setLimitReached(remaining === 0);
    }

    setLoadingUsage(false);
  };

  const playAudioChunk = useCallback((base64Audio) => {
    if (!audioContextRef.current) return;

    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const audioBuffer = audioContextRef.current.createBuffer(1, int16Array.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < int16Array.length; i++) {
        channelData[i] = int16Array[i] / 32768.0;
      }

      audioQueueRef.current.push(audioBuffer);
      audioChunkCountRef.current++;

      const MIN_BUFFER_CHUNKS = 2;
      if (!isPlayingRef.current && audioQueueRef.current.length >= MIN_BUFFER_CHUNKS) {
        playNextChunk();
      }
    } catch (error) {
      console.error('Error decoding audio:', error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playNextChunk = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      // Queue is fully drained — bot has finished speaking.
      // Add a short tail silence so the mic gate releases after the last
      // acoustic reflection has decayed rather than immediately.
      setTimeout(() => {
        isBotSpeakingRef.current = false;
      }, 300);
      return;
    }

    if (!audioContextRef.current) return;

    isPlayingRef.current = true;
    // Gate the microphone while bot audio is actively playing.
    isBotSpeakingRef.current = true;
    const audioBuffer = audioQueueRef.current.shift();

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    const currentTime = audioContextRef.current.currentTime;
    let startTime;
    if (nextPlayTimeRef.current <= currentTime) {
      startTime = currentTime;
    } else {
      startTime = nextPlayTimeRef.current;
    }

    nextPlayTimeRef.current = startTime + audioBuffer.duration;

    source.onended = () => {
      playNextChunk();
    };

    source.start(startTime);
  }, []);

  const startListening = async () => {
    if (limitReached) {
      alert(`You've reached your monthly limit of ${TIER_LIMITS[userTier].monthlyMinutes} minutes. Please upgrade to continue using voice conversations.`);
      return;
    }

    try {
      conversationStartTimeRef.current = Date.now();
      setElapsedSeconds(0);
      nextPlayTimeRef.current = 0;
      audioChunkCountRef.current = 0;
      sessionReadyRef.current = false;

      await startSession(selectedTopic);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      mediaStreamRef.current = stream;

      setConnectingToBackend(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      let sessionResponse, websocket_url, ephemeral_token;
      try {
        const { data: { user } } = await supabase.auth.getUser();

        sessionResponse = await fetch(`${API_BASE_URL}/webrtc_session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: selectedTopic,
            user_id: user?.id
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        setConnectingToBackend(false);

        if (!sessionResponse.ok) {
          const errorText = await sessionResponse.text();
          throw new Error(`Failed to get WebRTC session: ${sessionResponse.status} - ${errorText}`);
        }

        const responseData = await sessionResponse.json();
        websocket_url = responseData.websocket_url;
        ephemeral_token = responseData.ephemeral_token;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        setConnectingToBackend(false);
        if (fetchError.name === 'AbortError') {
          throw new Error('Backend request timed out after 2 minutes. Please try again.');
        }
        throw fetchError;
      }

      const ws = new WebSocket(
        websocket_url,
        [
          "realtime",
          `openai-insecure-api-key.${ephemeral_token}`
        ]
      );
      webSocketRef.current = ws;

      ws.onopen = () => {
        // Configure turn detection AND user-audio transcription via session.update.
        // CRITICAL (research validity): without `audio.input.transcription`, the
        // OpenAI Realtime GA API will NOT emit
        // `conversation.item.input_audio_transcription.completed`, which means
        // user utterances are never persisted to the `transcriptions` /
        // `conversation_messages` tables. Only assistant turns get saved, and
        // the SLA / feedback analyses in cando.py + feedback.py operate on an
        // incomplete transcript. See OpenAI GA Realtime docs (May 2026) — the
        // nested `audio.input.transcription` shape is required; the legacy
        // top-level `input_audio_transcription` is ignored by GA.
        // session.update is sent on open; audio is gated on session.created to avoid
        // sending chunks before OpenAI has finished setting up the session.
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            type: 'realtime',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.6,
              prefix_padding_ms: 300,
              silence_duration_ms: 1200,
              create_response: true,
              interrupt_response: true
            }
          }
        }));

        const context = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = context;

        const source = context.createMediaStreamSource(stream);
        const processor = context.createScriptProcessor(2048, 1, 1);
        scriptProcessorRef.current = processor;

        source.connect(processor);
        // ScriptProcessorNode must be connected to destination to stay alive
        // and keep firing onaudioprocess. A silent GainNode (gain=0) satisfies
        // the browser's graph requirement without routing mic audio to speakers.
        const silentGain = context.createGain();
        silentGain.gain.value = 0;
        processor.connect(silentGain);
        silentGain.connect(context.destination);

        processor.onaudioprocess = (event) => {
          // Gate: send silence while the bot is playing to prevent its audio
          // (picked up by the mic) from being sent as user speech.  The 300 ms
          // tail in playNextChunk lets room reflections decay before we reopen.
          if (isBotSpeakingRef.current) return;

          const left = event.inputBuffer.getChannelData(0);
          const int16Array = new Int16Array(left.length);
          for (let i = 0; i < left.length; i++) {
            int16Array[i] = Math.max(-1, Math.min(1, left[i])) * 0x7FFF;
          }

          if (ws.readyState === WebSocket.OPEN && sessionReadyRef.current) {
            const audioBytes = new Uint8Array(int16Array.buffer);
            const base64Audio = btoa(String.fromCharCode(...audioBytes));

            const audioMessage = JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: base64Audio
            });

            try {
              ws.send(audioMessage);
            } catch (sendError) {
              console.error('WebSocket send failed:', sendError);
            }
          }
        };
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        const sessionLogId = getSessionLogId();

        if (data.type === 'conversation.item.input_audio_transcription.completed') {
          const transcript = data.transcript;
          updateConversation(prev => [...prev, { role: "user", text: transcript }]);
          onSaveTranscription(transcript);

          if (sessionLogId && transcript) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
              await supabase.from('conversation_messages').insert([{
                session_id: sessionLogId,
                user_id: user.id,
                role: 'user',
                content: transcript
              }]);
            }
          }

        } else if (data.type === 'response.audio.delta' || data.type === 'response.output_audio.delta') {
          if (data.delta) {
            playAudioChunk(data.delta);
          }

        } else if (data.type === 'response.audio_transcript.delta' || data.type === 'response.output_audio_transcript.delta') {
          currentResponseTextRef.current += data.delta;
          setLiveTranscript(currentResponseTextRef.current);

        } else if (data.type === 'response.created') {
          currentResponseTextRef.current = '';
          audioChunkCountRef.current = 0;

        } else if (data.type === 'response.audio_transcript.done' || data.type === 'response.output_audio_transcript.done') {
          updateConversation(prev => [...prev, { role: "bot", text: data.transcript }]);

          if (data.transcript) {
            onSaveTranscription(`Bot: ${data.transcript}`);

            if (sessionLogId && data.transcript) {
              const user = (await supabase.auth.getUser()).data.user;
              if (user) {
                await supabase.from('conversation_messages').insert([{
                  session_id: sessionLogId,
                  user_id: user.id,
                  role: 'assistant',
                  content: data.transcript
                }]);
              }
            }
          }

          currentResponseTextRef.current = '';

        } else if (data.type === 'response.done') {
          currentResponseTextRef.current = '';

        } else if (data.type === 'error') {
          console.error("OpenAI Realtime API error:", data.error);
          setLiveTranscript("Error occurred. Please try again.");

        } else if (data.type === 'input_audio_buffer.speech_started') {
          if (audioQueueRef.current.length > 0 || isPlayingRef.current) {
            audioQueueRef.current = [];
            isPlayingRef.current = false;
            nextPlayTimeRef.current = 0;
          }
          // Bot audio interrupted by real user speech — open the mic gate.
          isBotSpeakingRef.current = false;
          setLiveTranscript("Listening...");

        } else if (data.type === 'input_audio_buffer.speech_stopped') {
          setLiveTranscript("Processing...");

        } else if (data.type === 'response.cancelled') {
          currentResponseTextRef.current = '';

        } else if (data.type === 'session.created' || data.type === 'session.updated') {
          if (data.type === 'session.created') {
            sessionReadyRef.current = true;
          }
          if (data.type === 'session.created' && selectedTopic) {
            const responseRequest = {
              type: 'response.create',
              response: {
                instructions: `Following ALL your existing system instructions (especially: respond ONLY in English, never in Spanish, French or any other language), start the conversation about "${selectedTopic.title}" by greeting the user and introducing the topic in a friendly, engaging way. Ask an opening question to get them talking.`
              }
            };
            ws.send(JSON.stringify(responseRequest));
          }
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setLiveTranscript("Error during listening. Please try again.");
        stopListening();
      };

      ws.onclose = (event) => {
        console.log(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
        setLiveTranscript("Assistant's response will appear here...");
      };

    } catch (error) {
      console.error('Error starting listening:', error);
      alert(`Microphone access failed: ${error.message}. Please ensure microphone permissions are granted.`);
      setSpeaking(false);
    }
  };

  const stopListening = useCallback(() => {
    endSession(conversationRef.current);

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    currentResponseTextRef.current = '';

    if (webSocketRef.current) {
      webSocketRef.current.close();
      webSocketRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (speaking) {
        stopListening();
        setSpeaking(false);
      }
    };
  }, [stopListening, speaking]);

  useEffect(() => {
    if (!speaking || isAdmin) return;

    const timerInterval = setInterval(() => {
      const secondsElapsed = Math.floor((Date.now() - conversationStartTimeRef.current) / 1000);
      setElapsedSeconds(secondsElapsed);

      const minutesElapsed = Math.ceil(secondsElapsed / 60);
      const remainingMinutes = usageRemaining - minutesElapsed;

      if (remainingMinutes <= 0) {
        alert('Your time is up! The conversation will now end.');
        stopListening();
        setSpeaking(false);
        setLimitReached(true);
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [speaking, isAdmin, usageRemaining, stopListening]);

  const handleToggleSpeaking = () => {
    const newState = !speaking;
    setSpeaking(newState);

    if (newState) {
      startListening();
    } else {
      stopListening();
    }
  };

  useEffect(() => {
    if (selectedTopic && !hasAutoStartedRef.current && !speaking) {
      hasAutoStartedRef.current = true;
      autoStartRequestedRef.current = true;
      setTimeout(() => {
        if (autoStartRequestedRef.current) {
          handleToggleSpeaking();
          autoStartRequestedRef.current = false;
        }
      }, 800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopic, speaking]);

  if (speaking) {
    const minutesElapsed = Math.ceil(elapsedSeconds / 60);
    const currentRemaining = isAdmin ? -1 : Math.max(0, usageRemaining - minutesElapsed);

    return <ListeningView onStop={handleToggleSpeaking} cardTheme={cardTheme} subtleText={subtleText} fontSizes={fontSizes} liveTranscript={liveTranscript} usageRemaining={currentRemaining} userTier={userTier} isAdmin={isAdmin} elapsedSeconds={elapsedSeconds} />;
  }

  return (
    <section aria-label="Voice chat" className="flex flex-col gap-6 h-full">
      {!loadingUsage && limitReached && (
        <div className="bg-orange-100 dark:bg-orange-900 border border-orange-300 dark:border-orange-700 rounded-xl p-4">
          <h3 className="font-bold text-orange-800 dark:text-orange-100 mb-1">{t('talk.limitReached.title')}</h3>
          <p className="text-sm text-orange-700 dark:text-orange-200">
            {t('talk.limitReached.message')} ({TIER_LIMITS[userTier].monthlyMinutes} min, {t(`tiers.${userTier}`)})
          </p>
        </div>
      )}

      {!loadingUsage && !limitReached && usageRemaining !== -1 && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-200">
                {usageRemaining} of {TIER_LIMITS[userTier].monthlyMinutes} minutes remaining
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-300 ml-2">
                ({TIER_LIMITS[userTier].name} tier)
              </span>
            </div>
            <div className="flex-1 max-w-xs ml-4">
              <div className="bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all"
                  style={{ width: `${(usageRemaining / TIER_LIMITS[userTier].monthlyMinutes) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {!loadingUsage && usageRemaining === -1 && (
        <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-600 dark:border-green-700 rounded-xl p-3 shadow-md">
          <span className="text-base font-extrabold text-gray-900 dark:text-green-100">
            ✨ Unlimited voice conversations {isAdmin ? '(Admin)' : `(${TIER_LIMITS[userTier].name} tier)`}
          </span>
        </div>
      )}

      <div className={`flex-1 flex flex-col justify-center items-center text-center rounded-3xl border p-8 ${cardTheme}`}>
        {connectingToBackend ? (
          <>
            <h2 className={`${fontSizes.xxxl} font-bold mb-2`}>{t('talk.connecting')}</h2>
            <p className={`${subtleText} ${fontSizes.lg} mb-8`}>
              {t('talk.connecting')}
            </p>
            <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          </>
        ) : (
          <>
            <h2 className={`${fontSizes.xxxl} font-bold mb-2`}>{t('talk.readyTitle')}</h2>
            <p className={`${subtleText} ${fontSizes.lg} mb-8`}>{t('talk.readySubtitle')}</p>
            <button
              onClick={handleToggleSpeaking}
              className="w-48 h-48 bg-green-600 text-white rounded-full flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform"
              aria-label="Start speaking"
            >
              <MicIcon size={72} />
            </button>
          </>
        )}
      </div>

      <div className={`rounded-3xl border p-5 ${cardTheme}`}>
        <h3 className={`font-bold ${fontSizes.xl} mb-4`}>{t('talk.todaysConversation')}</h3>
        <ul className="space-y-4">
          {conversation.map((msg, i) => (
            <ChatBubble key={i} role={msg.role} text={msg.text} fontSizes={fontSizes} />
          ))}
        </ul>
      </div>
    </section>
  );
}
