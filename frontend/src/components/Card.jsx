import React from 'react';

function Card({ children, className = '', hover = false, glass = false, ...props }) {
  const baseClasses = glass
    ? "bg-white/90 backdrop-blur-md rounded-[12px] shadow-[0_8px_30px_rgba(15,23,42,0.25)] border border-white/50"
    : "bg-white rounded-[12px] shadow-[0_1px_3px_rgba(15,23,42,0.08)] border border-[#E2E8F0]";
  const hoverClasses = hover ? "hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.08)] transition" : "";

  return (
    <div className={`${baseClasses} ${hoverClasses} ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Card;
