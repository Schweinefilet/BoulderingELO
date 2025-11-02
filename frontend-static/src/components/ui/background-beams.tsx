"use client";
import { motion } from "framer-motion";

export function BackgroundBeams() {
  const beams = [
    // Top area beams
    { x1: "-20%", y1: "-10%", x2: "80%", y2: "90%" },
    { x1: "-15%", y1: "0%", x2: "85%", y2: "100%" },
    { x1: "-10%", y1: "5%", x2: "90%", y2: "105%" },
    { x1: "0%", y1: "0%", x2: "100%", y2: "100%" },
    { x1: "10%", y1: "-10%", x2: "110%", y2: "90%" },
    { x1: "20%", y1: "-15%", x2: "120%", y2: "85%" },
    
    // Bottom area beams
    { x1: "-10%", y1: "10%", x2: "90%", y2: "110%" },
    { x1: "-5%", y1: "15%", x2: "95%", y2: "115%" },
    { x1: "5%", y1: "-5%", x2: "105%", y2: "95%" },
    { x1: "15%", y1: "5%", x2: "115%", y2: "105%" }
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
              delay: index * 0.6,
              ease: "easeInOut"
            }}
          />
        ))}
      </svg>
    </div>
  );
}
