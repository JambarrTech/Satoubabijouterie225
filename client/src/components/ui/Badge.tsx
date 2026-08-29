import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'gold' | 'outline' | 'success' | 'new';
  className?: string;
}

export function Badge({ children, variant = 'primary', className = '' }: BadgeProps) {
  const variants = {
    primary: "bg-[#EAF7ED] text-[#0B5D1E]",
    gold: "bg-amber-50 text-[#D9A441] border border-amber-200",
    outline: "border border-gray-200 text-gray-700 bg-white",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    new: "bg-[#0B5D1E] text-white"
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
