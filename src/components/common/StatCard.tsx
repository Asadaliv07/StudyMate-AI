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
  iconBg = 'var(--color-violet-50)',
}) => {
  const changeColor =
    changeType === 'positive'
      ? 'var(--color-emerald-600)'
      : changeType === 'negative'
      ? 'var(--color-rose-600)'
      : 'var(--color-text-muted)';

  return (
    <Card className="stat-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <span
            style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-text-muted)',
            }}
          >
            {title}
          </span>
          <div
            style={{
              fontSize: 'var(--font-size-3xl)',
              fontWeight: 800,
              color: 'var(--color-navy-900)',
              marginTop: 'var(--space-1)',
              lineHeight: 1.1,
            }}
          >
            {value}
          </div>
          {change && (
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 500,
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
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-violet-600)',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
};
