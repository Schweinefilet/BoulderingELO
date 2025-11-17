"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

// Basic touch check so we can keep the glow visible on phones and tablets
const isTouchDevice = () => {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
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
  borderRadius?: number | string;
}

export const GlowingCard = ({
  children,
  blur = 42,
  borderWidth = 8,
  spread = 720,
  glow = true,
  disabled = false,
  proximity = 200,
  inactiveZone = 0.01,
  className = "",
  borderRadius = 10,
}: GlowingCardProps) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const [touchDevice, setTouchDevice] = useState(false);
  const radiusValue = typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius;

  useEffect(() => {
    setTouchDevice(isTouchDevice());
  }, []);

  useEffect(() => {
    if (!divRef.current) return;

    // Default the glow to the center so touch users see it immediately
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: rect.width / 2, y: rect.height / 2 });
    if (!disabled && touchDevice) {
      setOpacity(0.8);
    }
  }, [touchDevice, disabled]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!divRef.current || disabled) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();

    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    setOpacity(1);
  };

  const handlePointerLeave = () => {
    if (disabled) return;
    setOpacity(touchDevice ? 0.65 : 0);
  };

  return (
    <div
      ref={divRef}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn("relative", className)}
      style={{ borderRadius: radiusValue }}
    >
      <>
        {/* Strong outer glow effect */}
        <div
          className="pointer-events-none absolute -inset-1 rounded-lg transition-opacity duration-300"
          style={{
            opacity: opacity,
            background: `radial-gradient(${spread}px circle at ${position.x}px ${position.y}px, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.45) 45%, transparent 75%)`,
            filter: `blur(${blur}px)`,
            borderRadius: radiusValue,
          }}
        />
        {/* Bright border effect */}
        <div
          className="pointer-events-none absolute -inset-px rounded-lg transition-opacity duration-300"
          style={{
            opacity: opacity,
            border: `${borderWidth}px solid transparent`,
            background: `radial-gradient(${spread}px circle at ${position.x}px ${position.y}px, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.6) 55%, transparent 82%) border-box`,
            WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            borderRadius: radiusValue,
          }}
        />
      </>
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
