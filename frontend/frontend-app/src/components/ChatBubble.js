import React from "react";

export function ChatBubble({ role, text, fontSizes }) {
  const isBot = role === "bot";
  const textSize = fontSizes?.lg || "text-lg";
  return (
    <li className={`flex gap-3 max-w-[85%] ${isBot ? "" : "self-end flex-row-reverse"}`}>
      <div className={`w-10 h-10 rounded-full flex-shrink-0 grid place-items-center ${isBot ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-200 dark:bg-gray-700'}`}>
        {isBot ? '🤖' : '🙂'}
      </div>
      <div className={`rounded-2xl px-4 py-3 border ${isBot ? "bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100" : "bg-green-50 dark:bg-green-900/50 border-green-200 dark:border-green-800 text-gray-900 dark:text-gray-100"}`}>
        <p className={`${textSize} leading-relaxed`}>{text}</p>
      </div>
    </li>
  );
}
