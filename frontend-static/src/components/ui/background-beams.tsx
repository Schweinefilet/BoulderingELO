"use client";
import { motion } from "framer-motion";

export function BackgroundBeams() {
  const beams = [
    // Top area beams - moved down
    { x1: "-50%", y1: "0%", x2: "50%", y2: "100%" },
    { x1: "-37.5%", y1: "12.5%", x2: "62.5%", y2: "112.5%" },
    { x1: "-25%", y1: "22.5%", x2: "75%", y2: "122.5%" },
    { x1: "0%", y1: "12.5%", x2: "100%", y2: "112.5%" },
    { x1: "25%", y1: "0%", x2: "125%", y2: "100%" },
    { x1: "50%", y1: "-12.5%", x2: "150%", y2: "87.5%" },
    
    // Bottom area beams - moved down
    { x1: "-25%", y1: "32.5%", x2: "75%", y2: "132.5%" },
    { x1: "-12.5%", y1: "45%", x2: "87.5%", y2: "145%" },
    { x1: "12.5%", y1: "2.5%", x2: "112.5%", y2: "102.5%" },
    { x1: "37.5%", y1: "22.5%", x2: "137.5%", y2: "122.5%" }
  ];

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
      
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%'
        }}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'rgba(59, 130, 246, 0)', stopOpacity: 0 }} />
            <stop offset="20%" style={{ stopColor: 'rgba(59, 130, 246, 0.3)', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: 'rgba(59, 130, 246, 0.6)', stopOpacity: 1 }} />
            <stop offset="80%" style={{ stopColor: 'rgba(59, 130, 246, 0.3)', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: 'rgba(59, 130, 246, 0)', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        
        {beams.map((beam, index) => (
          <motion.line
            key={index}
            x1={beam.x1}
            y1={beam.y1}
            x2={beam.x2}
            y2={beam.y2}
            stroke="url(#beam-gradient)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{
              opacity: [0, 0.8, 0],
              pathLength: [0, 1]
            }}
            transition={{
              duration: 5 + (index % 5) * 0.5,
              repeat: Infinity,
              delay: index * 1.5,
              ease: "easeInOut"
            }}
          />
        ))}
      </svg>
    </div>
  );
}
