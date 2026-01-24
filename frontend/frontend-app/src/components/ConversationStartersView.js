import React from "react";
import { useLanguage } from "../LanguageContext";

export function ConversationStartersView({ cardTheme, subtleText, fontSizes, onStartConversation }) {
  const { t } = useLanguage();

  const topics = [
    { title: "Ordering Coffee", description: "Practice ordering at a cafe", icon: "☕️" },
    { title: "Talking About Hobbies", description: "Discuss your favorite activities", icon: "🎨" },
    { title: "Daily Routine", description: "Describe your typical day", icon: "⏰" },
    { title: "Travel Plans", description: "Talk about trips and destinations", icon: "✈️" },
    { title: "Food & Cooking", description: "Discuss recipes and meals", icon: "🍳" },
    { title: "Weekend Activities", description: "Share what you do for fun", icon: "🎉" },
  ];

  const handleStartTopic = (topic) => {
    if (onStartConversation) {
      onStartConversation(topic);
    }
  };

  return (
    <section aria-label="Conversation starters" className="flex flex-col gap-6">
      <div>
        <h2 className={`${fontSizes.xxxl} font-bold`}>{t('starters.title')}</h2>
        <p className={`${subtleText} ${fontSizes.lg} mt-1`}>{t('starters.subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topics.map((topic, idx) => (
          <article key={idx} className={`rounded-2xl border p-6 flex flex-col justify-between ${cardTheme} hover:shadow-lg transition`}>
            <div>
              <div className="text-4xl mb-3">{topic.icon}</div>
              <div className={`font-bold ${fontSizes.xl} mb-2`}>{topic.title}</div>
              <div className={`${subtleText} ${fontSizes.base}`}>{topic.description}</div>
            </div>
            <button
              onClick={() => handleStartTopic(topic)}
              className={`mt-4 rounded-xl px-5 py-3 ${fontSizes.lg} font-semibold bg-green-600 text-white hover:bg-green-700 transition`}>
              {t('starters.start')}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
