import React from 'react';

interface GlowBorderProps {
  children: React.ReactNode;
  glowColor?: string;
  borderRadius?: number;
  padding?: number;
  backgroundColor?: string;
}

export function GlowBorder({ 
  children, 
  glowColor = 'var(--glow-color)',
  borderRadius = 8,
  padding = 0,
  backgroundColor = 'transparent'
}: GlowBorderProps) {
  return (
    <div style={{
      position: 'relative',
      borderRadius: `${borderRadius}px`,
      padding: '1px', // Border width
      background: `linear-gradient(145deg, ${glowColor}, transparent)`,
      boxShadow: `0 0 20px ${glowColor}, inset 0 0 20px ${glowColor}`,
    }}>
      <div style={{
        backgroundColor,
        borderRadius: `${borderRadius - 1}px`,
        padding: `${padding}px`,
        position: 'relative',
        zIndex: 1,
      }}>
        {children}
      </div>
    </div>
  );
}
