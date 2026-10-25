import React from 'react';
import { Card } from './Card';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'neutral' | 'negative';
  icon: React.ReactNode;
  iconBg?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeType = 'positive',
  icon,
  iconBg = 'var(--color-doodle-yellow-light)',
}) => {
  const changeColor =
    changeType === 'positive'
      ? '#059669'
      : changeType === 'negative'
      ? '#E11D48'
      : 'var(--color-ink-light)';

  return (
    <Card className="stat-card" style={{ overflow: 'visible', position: 'relative' }}>
      {/* Mini Washi Tape on top edge */}
      <div
        style={{
          position: 'absolute',
          top: '-10px',
          right: '24px',
          width: '60px',
          height: '18px',
          backgroundColor: 'rgba(255, 230, 109, 0.75)',
          borderLeft: '1.5px dashed rgba(30, 32, 34, 0.25)',
          borderRight: '1.5px dashed rgba(30, 32, 34, 0.25)',
          transform: 'rotate(2deg)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontFamily: 'var(--font-doodle)',
              fontSize: '1.05rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--color-ink-light)',
            }}
          >
            {title}
          </span>
          <div
            style={{
              fontFamily: 'var(--font-doodle)',
              fontSize: '2.5rem',
              fontWeight: 700,
              color: 'var(--color-ink)',
              marginTop: 'var(--space-1)',
              lineHeight: 1,
            }}
          >
            {value}
          </div>
          {change && (
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: changeColor,
                marginTop: 'var(--space-2)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
              }}
            >
              {change}
            </p>
          )}
        </div>
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: iconBg,
            border: '2px solid var(--color-ink)',
            boxShadow: '2px 2px 0px var(--color-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-ink)',
            flexShrink: 0,
            transform: 'rotate(-2deg)',
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
};
