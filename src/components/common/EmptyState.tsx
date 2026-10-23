import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className = '',
}) => {
  return (
    <div
      className={`empty-state-root ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--space-10) var(--space-6)',
        backgroundColor: 'var(--color-surface)',
        border: '2px dashed var(--color-ink)',
        borderRadius: 'var(--radius-doodle)',
        margin: 'var(--space-4) 0',
        boxShadow: 'var(--shadow-doodle)',
      }}
    >
      {icon && (
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-highlighter-yellow)',
            border: '2px solid var(--color-ink)',
            color: 'var(--color-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-4)',
            boxShadow: '2px 2px 0px var(--color-ink)',
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--font-size-lg)',
          fontWeight: 800,
          color: 'var(--color-ink)',
          marginBottom: 'var(--space-2)',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: 'var(--font-hand)',
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--color-ink-light)',
          maxWidth: '420px',
          lineHeight: 1.5,
          marginBottom: actionLabel ? 'var(--space-6)' : 0,
        }}
      >
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" icon={actionIcon} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
