import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useLanguage } from "../LanguageContext";
import { API_BASE_URL, TIER_LIMITS } from "../config/constants";
import { startSession, endSession, getSessionLogId } from "../utils/sessionManager";
import { MicIcon } from "./icons";
import { ChatBubble } from "./ChatBubble";
import { createVoiceTurn } from "../utils/voiceTurn";
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
  const { t, language } = useLanguage();
  const [voiceState, setVoiceState] = useState('connecting');
  const [voiceError, setVoiceError] = useState('');
  const turnRef = useRef(null);
  const attemptRef = useRef(0);
  const abortRef = useRef(null);
  const connectionTimerRef = useRef(null);

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
  const currentResponseTextRef = useRef('');
  const [liveTranscript, setLiveTranscript] = useState("");
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
    if (!user) { setLoadingUsage(false); setLimitReached(true); return; }

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

    const attempt = ++attemptRef.current;
    const active = () => attemptRef.current === attempt;
    setVoiceState('connecting');
    setVoiceError('');
    connectionTimerRef.current = setTimeout(() => { if (active()) failVoice(); }, 120000);
    try {
      conversationStartTimeRef.current = Date.now();
      setElapsedSeconds(0);

      // Create the output <audio> element SYNCHRONOUSLY, before any await —
      // iOS Safari only allows play() inside the user-gesture call stack.
      const audioEl = new Audio();
      audioEl.setAttribute('playsinline', '');
      audioEl.autoplay = true;
      speakerAudioElRef.current = audioEl;

      // Session logging starts after credentials are accepted, before audio connects.

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      if (!active()) { stream.getTracks().forEach(track => track.stop()); return; }
      mediaStreamRef.current = stream;
      stream.getAudioTracks()[0].enabled = false;

      setConnectingToBackend(true);

      const controller = new AbortController();
      abortRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      let sessionResponse, ephemeral_token, model, vadThreshold = 0.85, silenceDurationMs = 800;
      try {
        // The backend derives the user from the JWT and enforces usage
        // limits server-side; no user_id in the body.
        const { data: { session } } = await supabase.auth.getSession();
        if (!active()) { clearTimeout(timeoutId); return; }
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
        if (!active()) return;
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
        if (active()) setConnectingToBackend(false);
        if (fetchError.name === 'AbortError') {
          throw new Error('Backend request timed out after 2 minutes. Please try again.');
        }
        throw fetchError;
      }

      // WebRTC peer connection: mic goes up as a native track (echo-cancelled
      // by the OS against the bot audio coming down the same connection).
      if (!active()) return;
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      pc.addTrack(stream.getAudioTracks()[0], stream);

      pc.ontrack = (event) => {
        if (!active()) return;
        audioEl.srcObject = event.streams[0];
        audioEl.play().catch(() => { if (active()) failVoice(); });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.error('WebRTC connection state:', pc.connectionState);
          if (active()) failVoice();
        }
      };

      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      const turn = createVoiceTurn({
        track: stream.getAudioTracks()[0],
        send: event => { if (active() && dc.readyState === 'open') dc.send(JSON.stringify(event)); },
        onState: setVoiceState,
        onError: () => { if (active()) failVoice(); },
      });
      turnRef.current = turn;

      dc.onopen = () => {
        if (!active()) return;
        // Transcription is configured server-side at session creation (voice.py).
        // Only update turn detection here to avoid overriding transcription.
        // Automatic interruption stays off because speaker echo must never cut
        // off the assistant; the microphone gate below enforces half-duplex.
        dc.send(JSON.stringify({
          event_id: 'configure_voice_turn_detection',
          type: 'session.update',
          session: {
            type: 'realtime',
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

      let greeted = false;
      let pendingReply = '';
      dc.onmessage = async (event) => {
        if (!active()) return;
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
        if (!turn.handle(data)) return;
        if (data.type === 'session.updated') clearTimeout(connectionTimerRef.current);
        if (data.type === 'session.updated' && !greeted) conversationStartTimeRef.current = Date.now();
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
          pendingReply = '';

        } else if (data.type === 'response.audio_transcript.done' || data.type === 'response.output_audio_transcript.done') {
          pendingReply = data.transcript || '';
        } else if (data.type === 'output_audio_buffer.stopped') {
          const transcript = pendingReply;
          pendingReply = '';
          if (!transcript) return;
          updateConversation(prev => [...prev, { role: "bot", text: transcript }]);

          if (transcript) {
            onSaveTranscription(`Bot: ${transcript}`);

            if (sessionLogId && transcript) {
              const user = (await supabase.auth.getUser()).data.user;
              if (user) {
                await supabase.from('conversation_messages').insert([{
                  session_id: sessionLogId,
                  user_id: user.id,
                  role: 'assistant',
                  content: transcript
                }]);
              }
            }
          }

          currentResponseTextRef.current = '';

        } else if (data.type === 'error') {
          // Cancellation can race response.done; that specific error is harmless.
          if (data.error?.code !== 'response_cancel_not_active') failVoice();

        } else if (data.type === 'session.created' || data.type === 'session.updated') {
          if (data.type === 'session.updated' && selectedTopic && !greeted) {
            greeted = true;
            turn.prepare();
            const responseRequest = {
              type: 'response.create'
            };
            dc.send(JSON.stringify(responseRequest));
          }
        }
      };

      dc.onerror = (error) => {
        console.error('Data channel error:', error);
        if (active()) failVoice();
      };

      // SDP offer/answer exchange with the OpenAI Realtime API.
      await startSession(selectedTopic, active);
      if (!active()) return;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(
        `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`,
        {
          method: 'POST',
          body: offer.sdp,
          signal: controller.signal,
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
      if (!active()) return;
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      if (!active()) return;

    } catch (error) {
      console.error('Error starting listening:', error);
      if (active()) failVoice(error.name === 'NotAllowedError' ? 'permission' : 'connection');
    }
  };

  const stopListening = useCallback(() => {
    ++attemptRef.current;
    clearTimeout(connectionTimerRef.current);
    abortRef.current?.abort();
    abortRef.current = null;
    turnRef.current?.close();
    turnRef.current = null;
    endSession(conversationRef.current);

    currentResponseTextRef.current = '';
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

  const failVoice = (kind = 'connection') => {
    stopListening();
    setSpeaking(false);
    setConnectingToBackend(false);
    setVoiceError(kind);
  };

  useEffect(() => () => stopListening(), [stopListening]);

  useEffect(() => {
    if (!speaking || voiceState === 'connecting') return;

    const timerInterval = setInterval(() => {
      const secondsElapsed = Math.floor((Date.now() - conversationStartTimeRef.current) / 1000);
      setElapsedSeconds(secondsElapsed);

      const minutesElapsed = Math.floor(secondsElapsed / 60);
      const remainingMinutes = usageRemaining - minutesElapsed;

      if (!isAdmin && usageRemaining !== -1 && remainingMinutes <= 0) {
        setVoiceError('limit');
        stopListening();
        setSpeaking(false);
        setLimitReached(true);
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [speaking, voiceState, isAdmin, usageRemaining, stopListening]);

  const handleToggleSpeaking = () => {
    if (!speaking && (loadingUsage || limitReached)) return;
    const newState = !speaking;
    setSpeaking(newState);

    if (newState) {
      startListening();
    } else {
      stopListening();
    }
  };

  if (speaking) {
    const minutesElapsed = Math.floor(elapsedSeconds / 60);
    const currentRemaining = isAdmin || usageRemaining === -1 ? -1 : Math.max(0, usageRemaining - minutesElapsed);

    return <ListeningView stream={mediaStreamRef.current} voiceState={voiceState} onInterrupt={() => { turnRef.current?.interrupt(); currentResponseTextRef.current = ''; setLiveTranscript(''); }} onStop={handleToggleSpeaking} cardTheme={cardTheme} subtleText={subtleText} fontSizes={fontSizes} liveTranscript={liveTranscript} usageRemaining={currentRemaining} userTier={userTier} isAdmin={isAdmin} elapsedSeconds={elapsedSeconds} />;
  }

  return (
    <section aria-label="Voice chat" className="flex flex-col gap-6 h-full">
      {voiceError && <p role="alert" className="rounded-xl border-2 border-orange-600 p-4">
        {language === 'es'
          ? (voiceError === 'permission' ? 'Permite el acceso al micrófono en tu navegador y vuelve a intentarlo.' : voiceError === 'limit' ? 'Se ha terminado el tiempo disponible.' : 'No se ha podido mantener la conexión de voz. Comprueba el sonido y la conexión e inténtalo de nuevo.')
          : (voiceError === 'permission' ? 'Allow microphone access in your browser, then try again.' : voiceError === 'limit' ? 'Your available conversation time has ended.' : 'The voice connection could not continue. Check your sound and connection, then try again.')}
      </p>}
      {!loadingUsage && limitReached && (
        <div className="bg-orange-100 dark:bg-orange-900 border border-orange-300 dark:border-orange-700 rounded-xl p-4">
          <h3 className="font-bold text-orange-800 dark:text-orange-100 mb-1">{t('talk.limitReached.title')}</h3>
          <p className="text-sm text-orange-700 dark:text-orange-200">
            {t('talk.limitReached.message')} ({TIER_LIMITS[userTier].monthlyMinutes} min, {t(`tiers.${userTier}`)})
          </p>
        </div>
      )}

      {!loadingUsage && !limitReached && <p className={subtleText + ' text-center'}>
        {usageRemaining === -1
          ? (language === 'es' ? 'Conversaciones sin límite de tiempo' : 'Unlimited conversation time')
          : usageRemaining + (language === 'es' ? ' minutos disponibles' : ' minutes remaining')}
      </p>}

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
              disabled={loadingUsage || limitReached}
              aria-label={language === 'es' ? 'Empezar conversación' : 'Start conversation'}
            >
              <span><MicIcon size={72} /><span className="block mt-2 font-bold">{language === 'es' ? 'Empezar' : 'Start'}</span></span>
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
