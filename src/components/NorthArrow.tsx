import React from 'react';

interface NorthArrowProps {
  className?: string;
  size?: number;
}

export const NorthArrow: React.FC<NorthArrowProps> = ({ className = '', size = 52 }) => {
  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="drop-shadow-sm"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="50" r="46" fill="none" stroke="#1e293b" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="43" fill="none" stroke="#64748b" strokeWidth="0.75" strokeDasharray="2 2" />

        {/* Outer points / ticks */}
        <line x1="50" y1="4" x2="50" y2="10" stroke="#0f172a" strokeWidth="2" />
        <line x1="50" y1="90" x2="50" y2="96" stroke="#0f172a" strokeWidth="2" />
        <line x1="4" y1="50" x2="10" y2="50" stroke="#0f172a" strokeWidth="2" />
        <line x1="90" y1="50" x2="96" y2="50" stroke="#0f172a" strokeWidth="2" />

        {/* Diagonal ticks */}
        <line x1="17" y1="17" x2="22" y2="22" stroke="#64748b" strokeWidth="1" />
        <line x1="83" y1="17" x2="78" y2="22" stroke="#64748b" strokeWidth="1" />
        <line x1="17" y1="83" x2="22" y2="78" stroke="#64748b" strokeWidth="1" />
        <line x1="83" y1="83" x2="78" y2="78" stroke="#64748b" strokeWidth="1" />

        {/* North Arrow (Dark / Filled Half) */}
        <polygon points="50,10 50,50 42,50" fill="#0f172a" />
        {/* North Arrow (Light Half) */}
        <polygon points="50,10 58,50 50,50" fill="#e2e8f0" stroke="#0f172a" strokeWidth="0.8" />

        {/* South Arrow */}
        <polygon points="50,90 50,50 58,50" fill="#64748b" />
        <polygon points="50,90 42,50 50,50" fill="#f8fafc" stroke="#64748b" strokeWidth="0.8" />

        {/* East Arrow */}
        <polygon points="90,50 50,50 50,42" fill="#64748b" />
        <polygon points="90,50 50,58 50,50" fill="#f8fafc" stroke="#64748b" strokeWidth="0.8" />

        {/* West Arrow */}
        <polygon points="10,50 50,50 50,58" fill="#64748b" />
        <polygon points="10,50 50,42 50,50" fill="#f8fafc" stroke="#64748b" strokeWidth="0.8" />

        {/* Center pivot */}
        <circle cx="50" cy="50" r="3.5" fill="#0f172a" />
        <circle cx="50" cy="50" r="1.5" fill="#ffffff" />

        {/* Cardinal Letters */}
        <text
          x="50"
          y="18"
          textAnchor="middle"
          fontSize="11"
          fontWeight="900"
          fill="#0f172a"
          fontFamily="Arial, sans-serif"
        >
          N
        </text>
      </svg>
    </div>
  );
};
