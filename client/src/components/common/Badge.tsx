import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'portal' | 'cyan' | 'amber' | 'danger' | 'muted';
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  size = 'md',
  pulse = false,
}) => {
  const variantStyles = {
    portal: 'text-portal border-portal/40 bg-portal/10',
    cyan: 'text-cyanNeon border-cyanNeon/40 bg-cyanNeon/10',
    amber: 'text-amberNeon border-amberNeon/40 bg-amberNeon/10',
    danger: 'text-dangerNeon border-dangerNeon/40 bg-dangerNeon/10',
    muted: 'text-textMuted border-borderDim bg-surfaceLight/50',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 tracking-wider',
    md: 'text-xs px-2 py-0.5 tracking-wide',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium rounded border tabular-nums ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {pulse && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            variant === 'portal' ? 'bg-portal animate-pulse-glow shadow-portal-glow' : 'bg-current'
          }`}
        />
      )}
      <span>[ {children} ]</span>
    </span>
  );
};
