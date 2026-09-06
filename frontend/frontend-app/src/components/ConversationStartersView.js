import React, { useState } from "react";
import { useLanguage } from "../LanguageContext";
import { readPreference, writePreference } from "../utils/preferences";

const topics = [
  ['coffee', '☕️', 'Ordering Coffee', 'Pedir un café', 'Practice ordering at a café', 'Practica cómo pedir en una cafetería'],
  ['hobbies', '🎨', 'Talking About Hobbies', 'Tus aficiones', 'Discuss your favorite activities', 'Habla de tus actividades favoritas'],
  ['routine', '⏰', 'Daily Routine', 'Tu día a día', 'Describe your typical day', 'Describe un día habitual'],
  ['travel', '✈️', 'Travel Plans', 'Planes de viaje', 'Talk about trips and destinations', 'Habla de viajes y destinos'],
  ['food', '🍳', 'Food & Cooking', 'Comida y cocina', 'Discuss recipes and meals', 'Comparte recetas y comidas'],
  ['weekend', '🎉', 'Weekend Activities', 'El fin de semana', 'Share what you do for fun', 'Comparte lo que haces para divertirte'],
];

export function ConversationStartersView({ cardTheme, subtleText, fontSizes, onStartConversation, userId = 'guest' }) {
  const { language } = useLanguage();
  const es = language === 'es';
  const [expanded, setExpanded] = useState(false);
  const recent = topics.find(topic => topic[0] === readPreference('recent-topic-' + userId, null));
  const choose = topic => {
    writePreference('recent-topic-' + userId, topic?.id || null);
    onStartConversation(topic);
  };
  return (
    <section className="flex flex-col gap-6" aria-labelledby="topics-heading">
      <div>
        <h2 id="topics-heading" className={fontSizes.xxxl + ' font-bold'}>{es ? '¿De qué te gustaría hablar?' : 'What would you like to talk about?'}</h2>
        <p className={subtleText + ' ' + fontSizes.lg + ' mt-2'}>{es ? 'Elige un tema. Después podrás encender el micrófono cuando quieras.' : 'Choose a topic. You can turn on the microphone when you are ready.'}</p>
      </div>
      <button className={'min-h-[56px] rounded-xl border-2 p-4 font-semibold ' + cardTheme} onClick={() => choose(null)}>{es ? 'Hablar libremente — sin elegir tema' : 'Just chat — no topic needed'}</button>
      {recent && <button className="min-h-[52px] underline" onClick={() => choose({ id: recent[0], title: recent[2], description: recent[4] })}>{es ? 'Volver a practicar: ' : 'Practice again: '}{recent[es ? 3 : 2]}</button>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topics.slice(0, expanded ? topics.length : 3).map(([id, icon, title, titleEs, description, descriptionEs]) => (
          <article key={id} className={'rounded-2xl border p-6 flex flex-col ' + cardTheme}>
            <span aria-hidden="true" className="text-4xl mb-3">{icon}</span>
            <h3 className={'font-bold ' + fontSizes.xl}>{es ? titleEs : title}</h3>
            <p className={subtleText + ' my-3 flex-1'}>{es ? descriptionEs : description}</p>
            <button onClick={() => choose({ id, title, description })} className="min-h-[56px] rounded-xl px-4 py-3 font-semibold bg-green-700 text-white">{es ? 'Elegir este tema' : 'Choose this topic'}</button>
          </article>
        ))}
      </div>
      <button aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="min-h-[52px] underline font-semibold">{expanded ? (es ? 'Mostrar menos temas' : 'Show fewer topics') : (es ? 'Ver más temas' : 'More topics')}</button>
    </section>
  );
}
