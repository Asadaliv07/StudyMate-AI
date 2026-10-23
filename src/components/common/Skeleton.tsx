import React from 'react';

export interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius = 'var(--radius-sm)',
  className = '',
  count = 1,
}) => {
  const items = Array.from({ length: count });

  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          className={`skeleton-pulse ${className}`.trim()}
          style={{
            width,
            height,
            borderRadius,
            backgroundColor: 'var(--color-border)',
            marginBottom: count > 1 ? 'var(--space-2)' : 0,
            animation: 'skeletonPulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </>
  );
};
