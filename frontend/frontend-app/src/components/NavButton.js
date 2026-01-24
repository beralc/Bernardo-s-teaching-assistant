import React from "react";

export function NavButton({ active, onClick, label, icon, activeColor, inactiveColor }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-1 rounded-2xl py-2 transition-colors duration-200" aria-current={active ? "page" : undefined}>
      {React.cloneElement(icon, { color: active ? 'currentColor' : inactiveColor, className: active ? activeColor : inactiveColor })}
      <span className={`text-sm font-semibold ${active ? activeColor : inactiveColor}`}>{label}</span>
    </button>
  );
}
