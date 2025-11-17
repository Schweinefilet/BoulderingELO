import React from "react";

/**
 * Lightweight aurora background inspired by Aceternity's Aurora component.
 * Renders a set of blurred, animated radial gradients behind the page content.
 */
export const AuroraBackground = () => {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
        background: "radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.35), transparent 40%), radial-gradient(circle at 80% 10%, rgba(59, 130, 246, 0.35), transparent 35%), radial-gradient(circle at 50% 80%, rgba(14, 165, 233, 0.3), transparent 40%), radial-gradient(circle at 10% 60%, rgba(236, 72, 153, 0.25), transparent 38%)",
        filter: "blur(0px)",
      }}
    >
      <style>{`
        @keyframes auroraShift {
          0% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(-2%, -2%, 0) scale(1.05); }
          100% { transform: translate3d(0,0,0) scale(1); }
        }
        .aurora-layer {
          position: absolute;
          width: 160%;
          height: 160%;
          top: -30%;
          left: -30%;
          background: radial-gradient(circle at 30% 30%, rgba(59,130,246,0.35), transparent 45%), radial-gradient(circle at 70% 60%, rgba(236,72,153,0.25), transparent 45%), radial-gradient(circle at 60% 20%, rgba(16,185,129,0.25), transparent 40%);
          filter: blur(60px);
          animation: auroraShift 14s ease-in-out infinite alternate;
        }
      `}</style>
      <div className="aurora-layer" />
    </div>
  );
};
