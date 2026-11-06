import React from 'react';

function Button({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  onClick, 
  disabled = false,
  icon: Icon,
  className = '',
  type = 'button',
  ...props
}) {
  const baseClasses = "flex items-center justify-center gap-2 font-medium rounded-[10px] transition whitespace-nowrap disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#0C4A6E] text-white hover:bg-[#082F49] disabled:opacity-50",
    secondary: "bg-[#F8FAFC] text-[#0C4A6E] border border-[#E2E8F0] hover:bg-white disabled:opacity-50",
    text: "text-[#0369A1] hover:opacity-70 disabled:opacity-50"
  };

  const sizes = {
    small: "px-3 py-2 text-sm",
    medium: "px-4 py-2.5 text-base",
    large: "px-6 py-3 text-base"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
      {children}
    </button>
  );
}

export default Button;
