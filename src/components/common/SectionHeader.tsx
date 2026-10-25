import React from 'react';
import { Badge } from './Badge';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: 'violet' | 'navy' | 'emerald' | 'amber';
  action?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  badgeText,
  badgeVariant = 'violet',
  action,
  align = 'left',
  className = '',
}) => {
  return (
    <div
      className={`section-header ${className}`}
      style={{
        display: 'flex',
        flexDirection: align === 'center' ? 'column' : 'row',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        justifyContent: 'space-between',
        textAlign: align === 'center' ? 'center' : 'left',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ maxWidth: align === 'center' ? '700px' : 'none', minWidth: 0 }}>
        {badgeText && (
          <div style={{ marginBottom: 'var(--space-2)' }}>
            <Badge variant={badgeVariant}>{badgeText}</Badge>
          </div>
        )}
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 800,
            color: 'var(--color-ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              fontFamily: 'var(--font-hand)',
              marginTop: 'var(--space-1)',
              color: 'var(--color-ink-light)',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div
          className="section-header-action"
          style={{
            alignSelf: align === 'center' ? 'center' : 'flex-start',
            maxWidth: '100%',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
          }}
        >
          {action}
        </div>
      )}
    </div>
  );
};
