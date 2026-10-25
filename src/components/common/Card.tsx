import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'navy';
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  interactive = false,
  padding = 'md',
  className = '',
  ...props
}) => {
  const variantClass = variant === 'navy' ? 'card-navy' : variant === 'elevated' ? 'card-elevated' : '';
  const interactiveClass = interactive ? 'card-interactive' : '';
  
  const paddingStyles: Record<string, string> = {
    none: '0',
    sm: 'clamp(var(--space-3), 2.5vw, var(--space-4))',
    md: 'clamp(var(--space-4), 3.5vw, var(--space-6))',
    lg: 'clamp(var(--space-5), 4.5vw, var(--space-8))',
  };

  return (
    <div
      className={`card ${variantClass} ${interactiveClass} ${className}`.trim()}
      style={{ padding: paddingStyles[padding], ...props.style }}
      {...props}
    >
      {children}
    </div>
  );
};
