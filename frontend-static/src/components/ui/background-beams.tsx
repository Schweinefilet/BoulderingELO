"use client";
import { motion } from "framer-motion";

export function BackgroundBeams() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: -1,
      overflow: 'hidden',
      pointerEvents: 'none'
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom right, #020617, #172554, #020617)'
      }} />
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            height: '1px',
            width: '100%',
            background: 'linear-gradient(to right, transparent, rgba(59, 130, 246, 0.2), transparent)',
            top: `${20 + i * 30}%`,
            left: 0,
          }}
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}
