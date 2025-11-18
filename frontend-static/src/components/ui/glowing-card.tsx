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
  blur = 60,
  borderWidth = 12,
  spread = 920,
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

  const moveGlowPosition = (clientX: number, clientY: number) => {
    if (!divRef.current) return;

    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: clientX - rect.left, y: clientY - rect.top });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!divRef.current || disabled) return;

    moveGlowPosition(e.clientX, e.clientY);

    setOpacity(1);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!divRef.current || disabled) return;
    const touch = e.touches[0] ?? e.changedTouches[0];
    if (!touch) return;

    moveGlowPosition(touch.clientX, touch.clientY);
    setOpacity(1);
  };

  const handlePointerLeave = () => {
    if (disabled) return;
    setOpacity(touchDevice ? 0.65 : 0);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    handleTouchMove(e);
  };

  const handleTouchEnd = () => {
    handlePointerLeave();
  };

  const handleTouchCancel = () => {
    handlePointerLeave();
  };

  const mobileIdleOpacity = 0.65;
  const glowActive = glow && !disabled;
  const baseOpacity = touchDevice ? mobileIdleOpacity : 0.12;
  const effectiveOpacity = glowActive ? Math.max(opacity, baseOpacity) : 0;
  const highlightColor = "rgba(255, 255, 255, 0.96)";
  const accentColor = "rgba(59, 130, 246, 0.6)";
  const borderTint = "rgba(16, 185, 129, 0.75)";
  const shadowColor = `rgba(59, 130, 246, ${Math.min(0.85, effectiveOpacity)})`;

  return (
    <div
      ref={divRef}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      className={cn("relative", className)}
      style={{ borderRadius: radiusValue }}
    >
      <>
        {/* Strong outer glow effect */}
        <div
          className="pointer-events-none absolute -inset-1 rounded-lg transition-opacity duration-300"
          style={{
            opacity: effectiveOpacity,
            background: `radial-gradient(${spread}px circle at ${position.x}px ${position.y}px, ${highlightColor}, ${accentColor} 45%, transparent 78%)`,
            filter: `blur(${blur}px)`,
            boxShadow: effectiveOpacity ? `0 0 ${spread / 2}px ${shadowColor}` : undefined,
            borderRadius: radiusValue,
            mixBlendMode: "screen",
          }}
        />
        {/* Bright border effect */}
        <div
          className="pointer-events-none absolute -inset-px rounded-lg transition-opacity duration-300"
          style={{
            opacity: effectiveOpacity,
            border: `${borderWidth}px solid transparent`,
            background: `radial-gradient(${spread}px circle at ${position.x}px ${position.y}px, ${highlightColor}, ${borderTint} 55%, transparent 82%) border-box`,
            WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            borderRadius: radiusValue,
            boxShadow: effectiveOpacity ? `0 0 ${borderWidth * 3}px ${shadowColor}` : undefined,
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
