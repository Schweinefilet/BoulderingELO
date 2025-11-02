"use client";
import { motion } from "framer-motion";

export function BackgroundBeams() {
  const paths = [
    "M-380 -189C-380 -189 -312 216 152 343C616 470 684 875 684 875",
    "M-373 -197C-373 -197 -305 208 159 335C623 462 691 867 691 867",
    "M-366 -205C-366 -205 -298 200 166 327C630 454 698 859 698 859",
    "M-359 -213C-359 -213 -291 192 173 319C637 446 705 851 705 851",
    "M-352 -221C-352 -221 -284 184 180 311C644 438 712 843 712 843"
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
      >
        <defs>
          <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: 'rgba(59, 130, 246, 0)', stopOpacity: 0 }} />
            <stop offset="50%" style={{ stopColor: 'rgba(59, 130, 246, 0.5)', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: 'rgba(59, 130, 246, 0)', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        
        {paths.map((path, index) => (
          <g key={index}>
            <motion.path
              d={path}
              stroke="url(#beam-gradient)"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 1, 0],
                opacity: [0, 0.8, 0]
              }}
              transition={{
                duration: 4 + index,
                repeat: Infinity,
                delay: index * 0.5,
                ease: "linear"
              }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
