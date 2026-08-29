import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  rightIcon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-[#0B5D1E] hover:bg-[#064A15] text-white shadow-sm focus:ring-[#0B5D1E]",
    secondary: "bg-[#EAF7ED] hover:bg-[#d5eed9] text-[#0B5D1E] focus:ring-[#0B5D1E]",
    outline: "border border-gray-300 hover:border-[#0B5D1E] bg-white text-gray-800 focus:ring-[#0B5D1E]",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-700",
    gold: "bg-[#D9A441] hover:bg-[#c49237] text-white shadow-sm focus:ring-[#D9A441]"
  };

  const sizes = {
    sm: "px-3.5 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3.5 text-base"
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
      {rightIcon && !isLoading ? <span className="ml-2">{rightIcon}</span> : null}
    </motion.button>
  );
}
