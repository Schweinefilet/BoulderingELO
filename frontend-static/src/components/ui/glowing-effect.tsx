"use client";

import React, { useRef, useState } from "react";
import { cn } from "../../lib/utils";

interface GlowingEffectProps {
  blur?: number;
  borderWidth?: number;
  spread?: number;
  glow?: boolean;
  disabled?: boolean;
  proximity?: number;
  inactiveZone?: number;
}

export const GlowingEffect = ({
  blur = 0,
  borderWidth = 3,
  spread = 80,
  glow = true,
  disabled = false,
  proximity = 64,
  inactiveZone = 0.01,
}: GlowingEffectProps) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || disabled) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPosition({ x, y });

    // Calculate distance from center
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const distance = Math.sqrt(
      Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
    );
    const maxDistance = Math.sqrt(
      Math.pow(rect.width / 2, 2) + Math.pow(rect.height / 2, 2)
    );

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
      className="absolute inset-0 overflow-hidden rounded-2xl md:rounded-3xl"
    >
      <div
        className={cn(
          "pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300",
          glow && "opacity-100"
        )}
        style={{
          opacity: opacity,
          background: `radial-gradient(${spread}px circle at ${position.x}px ${position.y}px, rgba(59, 130, 246, 0.4), transparent 40%)`,
        }}
      />
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl md:rounded-3xl"
        style={{
          borderWidth: `${borderWidth}px`,
          borderStyle: "solid",
          borderImage: `radial-gradient(${spread}px circle at ${position.x}px ${position.y}px, rgba(59, 130, 246, ${opacity}), transparent 40%) 1`,
          filter: blur > 0 ? `blur(${blur}px)` : "none",
        }}
      />
    </div>
  );
};
