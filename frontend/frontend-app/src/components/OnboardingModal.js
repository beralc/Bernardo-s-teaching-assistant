import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { MicIcon, StopIcon } from './icons';

const key = (userId) => `onboarding-complete-v4-${userId || 'guest'}`;
export function hasCompletedOnboarding(userId) {
  try { return localStorage.getItem(key(userId)) === 'true'; } catch { return false; }
}
export function markOnboardingComplete(userId) {
  try { localStorage.setItem(key(userId), 'true'); } catch { /* Guide remains usable without storage. */ }
}

const copy = {
  en: {
    title: 'A quick practice before you begin', language: 'Guide language', close: 'Close guide',
    next: 'Next', back: 'Back', done: 'Go to the app', step: 'Step', of: 'of',
    headings: ['Choose what to talk about', 'Try the conversation buttons', 'Speak when you are ready'],
    intro: 'Practise English with an AI conversation partner. You can choose an everyday topic in Starters, or open Talk for a conversation of your own.',
    reassurance: 'You do not need perfect English. The assistant can offer a short language suggestion. You can ask it to explain or speak more slowly.',
    demo: 'This is a practice button. It does not open your microphone, send audio, or use your conversation minutes.',
    start: 'Try starting', stop: 'Try stopping', stopped: 'Practice finished. In a real conversation, the red button ends the conversation.',
    running: 'Practice started. Press the large red button to end it.',
    permission: 'When you start a real conversation, your browser may ask to use the microphone. Choose Allow if you want to speak.',
    turns: 'Wait until you see “Your turn” before answering. To interrupt a reply, tap “I would like to speak” and wait for “Your turn”. The red button ends the conversation.',
    help: 'If the microphone is blocked, open this site’s permissions in your browser and allow microphone access. If you cannot hear the assistant, check your volume. Headphones can help with echo.',
    control: 'You can end a conversation at any time with the large red button. Open this guide again using How to use the app.',
  },
  es: {
    title: 'Una práctica breve antes de empezar', language: 'Idioma de la guía', close: 'Cerrar guía',
    next: 'Siguiente', back: 'Atrás', done: 'Ir a la aplicación', step: 'Paso', of: 'de',
    headings: ['Elige de qué hablar', 'Prueba los botones', 'Habla cuando estés preparado'],
    intro: 'Practica inglés con un asistente de inteligencia artificial. Puedes elegir un tema cotidiano en Temas, o abrir Hablar para conversar sobre lo que quieras.',
    reassurance: 'No necesitas hablar un inglés perfecto. El asistente puede ofrecerte una breve sugerencia. Puedes pedirle que la explique o que hable más despacio.',
    demo: 'Este botón es de práctica. No abre el micrófono, no envía audio ni consume minutos de conversación.',
    start: 'Probar cómo empezar', stop: 'Probar cómo terminar', stopped: 'Práctica terminada. En una conversación real, el botón rojo termina la conversación.',
    running: 'Práctica iniciada. Pulsa el botón rojo grande para terminarla.',
    permission: 'Al empezar una conversación real, el navegador puede pedir permiso para usar el micrófono. Elige Permitir si quieres hablar.',
    turns: 'Espera a ver “Tu turno” antes de responder. Para interrumpir una respuesta, pulsa “Quiero hablar” y espera a ver “Tu turno”. El botón rojo termina la conversación.',
    help: 'Si el micrófono está bloqueado, abre los permisos de esta página en el navegador y permite el acceso. Si no oyes al asistente, comprueba el volumen. Los auriculares pueden ayudar a reducir el eco.',
    control: 'Puedes terminar la conversación en cualquier momento con el botón rojo grande. Puedes volver a esta guía desde Cómo usar la aplicación.',
  },
};

export function OnboardingModal({ userId, onComplete, fontSizes }) {
  const { language, setLanguage } = useLanguage();
  const c = copy[language] || copy.en;
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [practised, setPractised] = useState(false);
  const dialog = useRef(null);
  const heading = useRef(null);
  const scrollArea = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    heading.current?.focus();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    heading.current?.focus();
    if (scrollArea.current) scrollArea.current.scrollTop = 0;
  }, [step]);
  const finish = () => { markOnboardingComplete(userId); onComplete(); };
  const button = 'min-h-[52px] rounded-xl border-2 border-gray-600 px-4 py-3 font-semibold focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-700';
  return (
    <dialog ref={dialog} aria-labelledby="guide-title" onCancel={(e) => { e.preventDefault(); finish(); }}
      className="m-auto w-full max-w-xl max-h-[95dvh] rounded-2xl bg-white text-gray-900 p-0 backdrop:bg-black/60">
      <div className={`flex max-h-[95dvh] flex-col ${fontSizes?.lg || 'text-xl'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <label className="flex flex-wrap items-center gap-2">{c.language}
            <select className="min-h-[52px] rounded-lg border-2 border-gray-600 p-2 bg-white" value={language} onChange={e => setLanguage(e.target.value)}>
              <option value="es">Español</option><option value="en">English</option>
            </select>
          </label>
          <button className={button} onClick={finish}>{c.close}</button>
        </div>
        <div ref={scrollArea} className="min-h-0 overflow-y-auto p-6 space-y-5 leading-relaxed">
          <p className="text-gray-700">{c.title}</p>
          <h2 id="guide-title" ref={heading} tabIndex={-1} className={`${fontSizes?.xxl || 'text-3xl'} font-bold`}>{c.headings[step]}</h2>
          {step === 0 && <><p>{c.intro}</p><p className="rounded-xl bg-green-50 border border-green-800 p-4">{c.reassurance}</p></>}
          {step === 1 && <>
            <p>{c.demo}</p>
            <button onClick={() => { setRunning(!running); if (running) setPractised(true); }}
              aria-label={running ? c.stop : c.start}
              className={`mx-auto w-48 h-48 rounded-full text-white flex flex-col items-center justify-center gap-2 shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-blue-700 ${running ? 'bg-red-600' : 'bg-green-700'}`}>
              {running ? <StopIcon /> : <MicIcon />}<span className="text-lg font-bold px-3">{running ? c.stop : c.start}</span>
            </button>
            <p role="status">{running ? c.running : practised ? c.stopped : c.start}</p>
          </>}
          {step === 2 && <><p>{c.permission}</p><p>{c.turns}</p><p>{c.control}</p><details className="rounded-xl border-2 border-gray-600 p-4"><summary className="cursor-pointer font-semibold min-h-[44px]">{language === 'es' ? 'Si algo no funciona' : 'If something does not work'}</summary><p className="mt-3">{c.help}</p></details></>}
        </div>
        <footer className="border-t p-4 space-y-3 shrink-0">
          <p className="text-center">{c.step} {step + 1} {c.of} 3</p>
          <div className="flex flex-wrap gap-3">
            {step > 0 && <button className={`${button} flex-1`} onClick={() => { setRunning(false); setStep(step - 1); }}>{c.back}</button>}
            <button className={`${button} flex-1 bg-green-700 text-white`} onClick={() => { setRunning(false); if (step === 2) finish(); else setStep(step + 1); }}>{step === 2 ? c.done : c.next}</button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}
