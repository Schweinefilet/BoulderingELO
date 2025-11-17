import React from "react";

/**
 * Minimal shooting stars + starfield overlay for modals.
 * Based on Aceternity's shooting stars concept, simplified to avoid extra deps.
 */
export const ShootingStars = () => {
  const stars = Array.from({ length: 20 });
  const trails = Array.from({ length: 6 });

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0
      }}
    >
      <style>{`
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.2); }
        }
        @keyframes shooting {
          0% { transform: translate3d(120%, -20%, 0); opacity: 0; }
          5% { opacity: 1; }
          100% { transform: translate3d(-20%, 120%, 0); opacity: 0; }
        }
      `}</style>
      {stars.map((_, i) => (
        <span
          key={`star-${i}`}
          style={{
            position: "absolute",
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            width: 2,
            height: 2,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.8)",
            animation: "starTwinkle 3s ease-in-out infinite",
            animationDelay: `${Math.random() * 3}s`,
          }}
        />
      ))}
      {trails.map((_, i) => (
        <span
          key={`trail-${i}`}
          style={{
            position: "absolute",
            top: `${Math.random() * 80}px`,
            right: `${Math.random() * 120}px`,
            width: 120,
            height: 2,
            background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.8), rgba(255,255,255,0))",
            filter: "drop-shadow(0 0 6px rgba(255,255,255,0.6))",
            transform: "translate3d(0,0,0) rotate(-35deg)",
            animation: "shooting 5s linear infinite",
            animationDelay: `${i * 0.8}s`
          }}
        />
      ))}
    </div>
  );
};
