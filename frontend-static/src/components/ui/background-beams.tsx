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
        background: '#000000'
      }} />
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            height: '2px',
            width: '100%',
            background: 'linear-gradient(to right, transparent, rgba(59, 130, 246, 0.4), transparent)',
            top: `${15 + i * 20}%`,
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
