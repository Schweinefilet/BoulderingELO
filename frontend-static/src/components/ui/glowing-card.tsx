"use client";

import React, { useRef, useState } from "react";
import { cn } from "../../lib/utils";

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
  blur = 0,
  borderWidth = 2,
  spread = 120,
  glow = true,
  disabled = false,
  proximity = 80,
  inactiveZone = 0.01,
  className = "",
}: GlowingCardProps) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || disabled) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();

    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    // Calculate distance from mouse to center
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const distanceX = e.clientX - rect.left - centerX;
    const distanceY = e.clientY - rect.top - centerY;
    const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);
    const maxDistance = Math.sqrt(centerX ** 2 + centerY ** 2);

    // Calculate opacity based on proximity
    const normalizedDistance = distance / maxDistance;
    const newOpacity = Math.max(
      0,
      1 - normalizedDistance / (1 - inactiveZone)
    );
    setOpacity(newOpacity);
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
      {/* Glow effect overlay */}
      <div
        className={cn(
          "pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 rounded-lg",
          glow && "opacity-100"
        )}
        style={{
          opacity: opacity,
          background: `radial-gradient(${spread}px circle at ${position.x}px ${position.y}px, rgba(59, 130, 246, 0.3), transparent 40%)`,
        }}
      />
      {/* Border effect */}
      <div
        className="pointer-events-none absolute -inset-px rounded-lg"
        style={{
          borderWidth: `${borderWidth}px`,
          borderStyle: "solid",
          borderImage: `radial-gradient(${spread}px circle at ${position.x}px ${position.y}px, rgba(59, 130, 246, ${opacity}), transparent 40%) 1`,
          filter: blur > 0 ? `blur(${blur}px)` : "none",
        }}
      />
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
