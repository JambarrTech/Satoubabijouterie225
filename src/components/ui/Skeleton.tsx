import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  key?: string | number;
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} {...props} />
  );
}
