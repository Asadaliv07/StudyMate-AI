import React from 'react';

interface DoodleProps {
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Hand-drawn pencil sketch doodle
 */
export const DoodlePencil: React.FC<DoodleProps> = ({ size = 24, color = '#1E2022', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ overflow: 'visible' }}
  >
    <path
      d="M32 6 L42 16 L16 42 L6 42 L6 32 Z"
      fill="#FFE66D"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 38 L6 42"
      stroke={color}
      strokeWidth="3.5"
      strokeLinecap="round"
    />
    <path
      d="M27 11 L37 21"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M12 36 L12 42 L6 42"
      fill={color}
    />
  </svg>
);

/**
 * Hand-drawn lightbulb / "Aha!" moment doodle
 */
export const DoodleLightbulb: React.FC<DoodleProps> = ({ size = 28, color = '#1E2022', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ overflow: 'visible' }}
  >
    <path
      d="M24 6 C15 6 10 13 10 20 C10 26 15 29 16 33 L32 33 C33 29 38 26 38 20 C38 13 33 6 24 6 Z"
      fill="#FFE66D"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18 37 L30 37 M20 41 L28 41 M22 45 L26 45"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
    />
    {/* Sparks */}
    <path
      d="M24 0 L24 3 M6 10 L9 12 M42 10 L39 12 M4 22 L1 22 M47 22 L44 22"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Hand-drawn Starburst / Celebration Doodle
 */
export const DoodleStar: React.FC<DoodleProps> = ({ size = 24, color = '#FFE66D', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ overflow: 'visible' }}
  >
    <path
      d="M18 2 L22 13 L34 14 L24 22 L27 34 L18 27 L9 34 L12 22 L2 14 L14 13 Z"
      fill={color}
      stroke="#1E2022"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Hand-drawn curly arrow pointing at an action
 */
export const DoodleArrow: React.FC<DoodleProps> = ({ size = 36, color = '#1E2022', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 60 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ overflow: 'visible' }}
  >
    <path
      d="M5 25 C15 5 40 8 48 22"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeDasharray="1 0"
    />
    <path
      d="M40 25 L50 24 L48 14"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Hand-drawn squiggly underline
 */
export const DoodleSquiggle: React.FC<{ width?: string | number; height?: string | number; color?: string; className?: string }> = ({
  width = 120,
  height = 12,
  color = '#FF6B6B',
  className = '',
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 120 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    preserveAspectRatio="none"
  >
    <path
      d="M2 6 Q 16 12, 30 6 T 60 6 T 90 6 T 118 6"
      stroke={color}
      strokeWidth="3.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Hand-drawn Coffee Mug Doodle
 */
export const DoodleCoffee: React.FC<DoodleProps> = ({ size = 26, color = '#1E2022', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M8 12 L10 32 C10 35 14 36 22 36 C30 36 34 35 34 32 L36 12 Z"
      fill="#BAE6FD"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M34 16 C38 16 40 19 40 23 C40 27 36 29 33 29"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Steam */}
    <path
      d="M15 4 C15 7 17 9 17 10 M22 2 C22 5 24 7 24 10 M29 4 C29 7 31 9 31 10"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Hand-drawn Paperclip Doodle
 */
export const DoodlePaperclip: React.FC<DoodleProps> = ({ size = 22, color = '#4A5056', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M10 14 L18 6 C21 3 26 5 26 9 L15 23 C12 27 7 24 6 20 L15 8 C17 6 20 7 20 9 L12 19"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Hand-drawn Checkmark doodle
 */
export const DoodleCheck: React.FC<DoodleProps> = ({ size = 20, color = '#1E2022', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M4 12 L9 18 L20 6"
      stroke={color}
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
