import React, { useEffect, useState } from 'react';
import { useLanguage } from '../LanguageContext';

// Local-only visualization; never a speech classifier or additional recording.
export function MicrophoneLevel({ stream, active }) {
  const [level, setLevel] = useState(0);
  const [available, setAvailable] = useState(false);
  const { language } = useLanguage();
  useEffect(() => {
    if (!active || !stream) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    let context, source, timer;
    try {
      context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source = context.createMediaStreamSource(stream);
      source.connect(analyser); // Deliberately not connected to the speakers.
      context.resume().catch(() => {});
      const samples = new Uint8Array(analyser.fftSize);
      timer = setInterval(() => {
        setAvailable(context.state === 'running');
        analyser.getByteTimeDomainData(samples);
        const energy = samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0);
        setLevel(Math.min(100, Math.round(Math.sqrt(energy / samples.length) * 300)));
      }, 150);
    } catch { setAvailable(false); }
    return () => {
      clearInterval(timer);
      source?.disconnect();
      context?.close().catch(() => {});
    };
  }, [active, stream]);
  if (!active || !available) return null;
  return <label className="block mb-5">
    {language === 'es' ? 'Nivel del micrófono' : 'Microphone level'}
    <meter className="block w-48 h-6 mx-auto" min="0" max="100" value={level} />
  </label>;
}
