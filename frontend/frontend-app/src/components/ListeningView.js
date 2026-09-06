import React from "react";
import { StopIcon } from "./icons";
import { useLanguage } from "../LanguageContext";
import { MicrophoneLevel } from "./MicrophoneLevel";

const labels = {
  en: { connecting: 'Connecting…', listening: 'Your turn — I’m listening', waiting: 'Waiting for a reply…', preparing: 'Preparing a reply…', speaking: 'The assistant is speaking', interrupting: 'Stopping the reply…' },
  es: { connecting: 'Conectando…', listening: 'Tu turno — te escucho', waiting: 'Esperando una respuesta…', preparing: 'Preparando una respuesta…', speaking: 'El asistente está hablando', interrupting: 'Deteniendo la respuesta…' },
};

export function ListeningView({ onStop, onInterrupt, stream, voiceState = 'connecting', cardTheme, subtleText, fontSizes, liveTranscript, usageRemaining, elapsedSeconds }) {
  const { language } = useLanguage();
  const es = language === 'es';
  const canInterrupt = ['speaking', 'preparing'].includes(voiceState);
  return (
    <section className="flex flex-col gap-6 h-full">
      <p className={subtleText + ' text-center'}>
        {es ? 'Tiempo' : 'Time'}: {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
        {usageRemaining >= 0 && ' · ' + usageRemaining + (es ? ' min disponibles' : ' min remaining')}
      </p>
      {usageRemaining >= 0 && usageRemaining <= 1 && <p role="status">{es ? 'Queda menos de un minuto.' : 'Less than one minute remaining.'}</p>}
      <div className={'flex-1 flex flex-col items-center text-center rounded-3xl border p-5 sm:p-8 ' + cardTheme}>
        <h2 role="status" className={fontSizes.xxxl + ' font-bold mb-3'}>{(labels[language] || labels.en)[voiceState]}</h2>
        <p className={subtleText + ' mb-6'}>{voiceState === 'listening'
          ? (es ? 'Habla a tu ritmo.' : 'Speak at your own pace.')
          : (es ? 'El micrófono está en pausa.' : 'Your microphone is paused.')}</p>
        <MicrophoneLevel stream={stream} active={voiceState === 'listening'} />
        <button onClick={onInterrupt} disabled={!canInterrupt} className="min-h-[56px] rounded-xl border-2 border-current px-5 py-3 mb-6 font-semibold disabled:opacity-40">
          {es ? 'Quiero hablar' : 'I would like to speak'}
        </button>
        <button onClick={onStop} className="w-48 h-48 shrink-0 bg-red-600 text-white rounded-full flex flex-col gap-3 items-center justify-center shadow-2xl">
          <StopIcon />
          <span className="font-bold text-xl">{es ? 'Terminar' : 'End conversation'}</span>
        </button>
      </div>
      <div className={'rounded-3xl border p-5 ' + cardTheme}>
        <h3 className={subtleText + ' mb-2 font-semibold'}>{es ? 'Texto de la respuesta' : 'Reply text'}</h3>
        <p className={'leading-relaxed min-h-[3em] ' + fontSizes.xxl}>{liveTranscript}</p>
      </div>
    </section>
  );
}
