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

  // WebRTC transport: the peer connection carries mic audio up and bot audio
  // down (so the OS applies real echo cancellation — critical on iOS), and
  // the "oai-events" data channel carries all JSON events.
  const mediaStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const speakerAudioElRef = useRef(null);
  const micReenableTimerRef = useRef(null);
  const assistantAudioPlayingRef = useRef(false);
  const currentResponseTextRef = useRef('');
  const [liveTranscript, setLiveTranscript] = useState("");
  const hasAutoStartedRef = useRef(false);
  const autoStartRequestedRef = useRef(false);
  const conversationRef = useRef([]);

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

  const startListening = async () => {
    if (limitReached) {
      alert(`You've reached your monthly limit of ${TIER_LIMITS[userTier].monthlyMinutes} minutes. Please upgrade to continue using voice conversations.`);
      return;
    }

    try {
      conversationStartTimeRef.current = Date.now();
      setElapsedSeconds(0);

      // Create the output <audio> element SYNCHRONOUSLY, before any await —
      // iOS Safari only allows play() inside the user-gesture call stack.
      const audioEl = new Audio();
      audioEl.setAttribute('playsinline', '');
      audioEl.autoplay = true;
      speakerAudioElRef.current = audioEl;

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

      let sessionResponse, ephemeral_token, model, vadThreshold = 0.85, silenceDurationMs = 800;
      try {
        // The backend derives the user from the JWT and enforces usage
        // limits server-side; no user_id in the body.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Not logged in. Please log in again.');
        }

        sessionResponse = await fetch(`${API_BASE_URL}/webrtc_session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            topic: selectedTopic
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        setConnectingToBackend(false);

        if (sessionResponse.status === 403) {
          setLimitReached(true);
          throw new Error('Monthly voice minutes limit reached.');
        }

        if (!sessionResponse.ok) {
          const errorText = await sessionResponse.text();
          throw new Error(`Failed to get WebRTC session: ${sessionResponse.status} - ${errorText}`);
        }

        const responseData = await sessionResponse.json();
        ephemeral_token = responseData.ephemeral_token;
        model = responseData.model || 'gpt-realtime-2.1-mini';
        vadThreshold = responseData.vad_threshold ?? 0.85;
        silenceDurationMs = responseData.silence_duration_ms ?? 800;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        setConnectingToBackend(false);
        if (fetchError.name === 'AbortError') {
          throw new Error('Backend request timed out after 2 minutes. Please try again.');
        }
        throw fetchError;
      }

      // WebRTC peer connection: mic goes up as a native track (echo-cancelled
      // by the OS against the bot audio coming down the same connection).
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      pc.addTrack(stream.getAudioTracks()[0], stream);

      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0];
        audioEl.play().catch((e) => console.warn('Bot audio play() blocked:', e));
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.error('WebRTC connection state:', pc.connectionState);
          setLiveTranscript("Connection lost. Please try again.");
        }
      };

      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      // While assistant audio is coming from the loudspeaker, send silence on
      // the WebRTC microphone track. This prevents acoustic echo from being
      // classified as a new learner turn. A short tail lets room echo decay.
      // This deliberately favors uninterrupted playback over barge-in.
      const setMicEnabled = (enabled) => {
        const micTrack = mediaStreamRef.current?.getAudioTracks?.()[0];
        if (micTrack && micTrack.readyState === 'live') micTrack.enabled = enabled;
      };

      const muteMicForAssistant = () => {
        if (micReenableTimerRef.current) {
          clearTimeout(micReenableTimerRef.current);
          micReenableTimerRef.current = null;
        }
        setMicEnabled(false);
      };

      const reenableMicAfterEchoTail = () => {
        if (micReenableTimerRef.current) clearTimeout(micReenableTimerRef.current);
        micReenableTimerRef.current = setTimeout(() => {
          setMicEnabled(true);
          micReenableTimerRef.current = null;
        }, 400);
      };

      dc.onopen = () => {
        // Transcription is configured server-side at session creation (voice.py).
        // Only update turn detection here to avoid overriding transcription.
        // Automatic interruption stays off because speaker echo must never cut
        // off the assistant; the microphone gate below enforces half-duplex.
        dc.send(JSON.stringify({
          event_id: 'configure_voice_turn_detection',
          type: 'session.update',
          session: {
            audio: {
              input: {
                turn_detection: {
                  type: 'server_vad',
                  threshold: vadThreshold,
                  prefix_padding_ms: 300,
                  silence_duration_ms: silenceDurationMs,
                  create_response: true,
                  interrupt_response: false
                }
              }
            }
          }
        }));
      };

      dc.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        const sessionLogId = getSessionLogId();

        if (data.type === 'conversation.item.input_audio_transcription.completed') {
          const transcript = data.transcript || '';
          if (!transcript.trim()) return;
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

        } else if (data.type === 'response.audio_transcript.delta' || data.type === 'response.output_audio_transcript.delta') {
          currentResponseTextRef.current += data.delta;
          setLiveTranscript(currentResponseTextRef.current);

        } else if (data.type === 'response.created') {
          currentResponseTextRef.current = '';
          muteMicForAssistant();

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
          // Audio playback can outlive response generation. The output-buffer
          // event is authoritative; this is a fallback for non-audio replies.
          if (!assistantAudioPlayingRef.current) reenableMicAfterEchoTail();

        } else if (data.type === 'output_audio_buffer.started') {
          assistantAudioPlayingRef.current = true;
          muteMicForAssistant();

        } else if (data.type === 'output_audio_buffer.stopped' || data.type === 'output_audio_buffer.cleared') {
          assistantAudioPlayingRef.current = false;
          reenableMicAfterEchoTail();

        } else if (data.type === 'error') {
          console.error("OpenAI Realtime API error:", data.error);
          assistantAudioPlayingRef.current = false;
          reenableMicAfterEchoTail();
          if (data.error?.event_id === 'configure_voice_turn_detection') {
            setLiveTranscript("Voice configuration failed. Please stop and try again.");
          } else {
            setLiveTranscript("Voice connection error. Please stop and try again.");
          }

        } else if (data.type === 'input_audio_buffer.speech_started') {
          // With half-duplex gating, this should only represent learner speech
          // captured while assistant playback is idle.
          setLiveTranscript("Listening...");

        } else if (data.type === 'input_audio_buffer.speech_stopped') {
          setLiveTranscript("Processing...");

        } else if (data.type === 'response.cancelled') {
          currentResponseTextRef.current = '';
          assistantAudioPlayingRef.current = false;
          reenableMicAfterEchoTail();

        } else if (data.type === 'session.created' || data.type === 'session.updated') {
          if (data.type === 'session.created' && selectedTopic) {
            const responseRequest = {
              type: 'response.create',
              response: {
                instructions: `Following ALL your existing system instructions (especially: respond ONLY in English, never in Spanish, French or any other language), start the conversation about "${selectedTopic.title}" by greeting the user and introducing the topic in a friendly, engaging way. Ask an opening question to get them talking.`
              }
            };
            dc.send(JSON.stringify(responseRequest));
          }
        }
      };

      dc.onerror = (error) => {
        console.error('Data channel error:', error);
        setLiveTranscript("Error during listening. Please try again.");
      };

      // SDP offer/answer exchange with the OpenAI Realtime API.
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(
        `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`,
        {
          method: 'POST',
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${ephemeral_token}`,
            'Content-Type': 'application/sdp'
          }
        }
      );

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        throw new Error(`WebRTC SDP exchange failed: ${sdpResponse.status} - ${errorText}`);
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

    } catch (error) {
      console.error('Error starting listening:', error);
      alert(`Microphone access failed: ${error.message}. Please ensure microphone permissions are granted.`);
      setSpeaking(false);
    }
  };

  const stopListening = useCallback(() => {
    endSession(conversationRef.current);

    currentResponseTextRef.current = '';
    assistantAudioPlayingRef.current = false;

    if (micReenableTimerRef.current) {
      clearTimeout(micReenableTimerRef.current);
      micReenableTimerRef.current = null;
    }

    if (dataChannelRef.current) {
      try { dataChannelRef.current.close(); } catch (e) { /* already closed */ }
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      try { peerConnectionRef.current.close(); } catch (e) { /* already closed */ }
      peerConnectionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (speakerAudioElRef.current) {
      speakerAudioElRef.current.pause();
      speakerAudioElRef.current.srcObject = null;
      speakerAudioElRef.current = null;
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
