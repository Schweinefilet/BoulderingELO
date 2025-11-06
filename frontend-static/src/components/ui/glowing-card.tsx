"use client";

import React, { useRef, useState } from "react";
import { cn } from "../../lib/utils";

// Detect if running on mobile device
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth <= 768;
};

interface GlowingCardProps {
  children: React.ReactNode;
  blur?: number;
  borderWidth?: number;
  spread?: number;
  glow?: boolean;
  disabled?: boolean;
  proximity?: number;
  inactiveZone?: number;
  className?: string;
}

export const GlowingCard = ({
  children,
  blur = 20,
  borderWidth = 5,
  spread = 350,
  glow = true,
  disabled = false,
  proximity = 200,
  inactiveZone = 0.01,
  className = "",
}: GlowingCardProps) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const isMobile = isMobileDevice();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || disabled || isMobile) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();

    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    // Make it always visible when hovering
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("relative", className)}
    >
      {/* Only render glow effects on desktop */}
      {!isMobile && (
        <>
          {/* Strong outer glow effect */}
          <div
            className="pointer-events-none absolute -inset-1 rounded-lg transition-opacity duration-300"
            style={{
              opacity: opacity,
              background: `radial-gradient(${spread}px circle at ${position.x}px ${position.y}px, rgba(59, 130, 246, 0.8), rgba(147, 51, 234, 0.4) 40%, transparent 70%)`,
              filter: `blur(${blur}px)`,
            }}
          />
          {/* Bright border effect */}
          <div
            className="pointer-events-none absolute -inset-px rounded-lg transition-opacity duration-300"
            style={{
              opacity: opacity,
              border: `${borderWidth}px solid transparent`,
              background: `radial-gradient(${spread}px circle at ${position.x}px ${position.y}px, rgba(59, 130, 246, 1), rgba(147, 51, 234, 0.6) 50%, transparent 80%) border-box`,
              WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
          />
        </>
      )}
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
