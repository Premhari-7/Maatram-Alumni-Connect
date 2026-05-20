import React from 'react';
import { motion } from 'framer-motion';

interface TreeAnimationProps {
  progress: number; // 0.0 to 1.0
  isLoggedIn: boolean;
}

export const TreeAnimation = ({ progress, isLoggedIn }: TreeAnimationProps) => {
  const actualProgress = isLoggedIn ? 1.0 : progress;

  // Sparkles configuration: count and intensity scale with form completion progress
  const sparkCount = Math.floor(4 + actualProgress * 14); // 4 when empty, up to 18 when progress=1.0

  const allSparks = [
    { left: '35%', top: '70%', delay: 0.1, size: 4 },
    { left: '65%', top: '65%', delay: 0.4, size: 5 },
    { left: '42%', top: '55%', delay: 0.8, size: 3 },
    { left: '58%', top: '60%', delay: 1.2, size: 6 },
    { left: '48%', top: '45%', delay: 0.2, size: 4 },
    { left: '52%', top: '50%', delay: 1.5, size: 5 },
    { left: '38%', top: '40%', delay: 0.6, size: 4 },
    { left: '62%', top: '42%', delay: 0.9, size: 5 },
    { left: '45%', top: '30%', delay: 1.1, size: 3 },
    { left: '55%', top: '28%', delay: 1.7, size: 6 },
    { left: '32%', top: '50%', delay: 0.3, size: 4 },
    { left: '68%', top: '48%', delay: 0.7, size: 5 },
    { left: '50%', top: '20%', delay: 1.3, size: 4 },
    { left: '40%', top: '25%', delay: 0.5, size: 5 },
    { left: '60%', top: '22%', delay: 1.0, size: 4 },
    { left: '46%', top: '62%', delay: 1.4, size: 3 },
    { left: '54%', top: '66%', delay: 1.6, size: 5 },
    { left: '50%', top: '35%', delay: 0.0, size: 4 }
  ];

  const activeSparks = allSparks.slice(0, sparkCount);

  return (
    <div className="tree-container">
      <style>{`
        .tree-container {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: radial-gradient(circle at center, #03050a 0%, #000000 100%);
          border-right: 1px solid rgba(255, 215, 0, 0.05);
        }
      `}</style>

      {/* Dynamic Golden Halo Backdrop */}
      <motion.div
        animate={{
          scale: [0.95, 1.05, 0.95],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: `${200 + actualProgress * 160}px`,
          height: `${200 + actualProgress * 160}px`,
          background: `radial-gradient(circle, rgba(255, 215, 0, ${0.08 + actualProgress * 0.16}) 0%, rgba(255, 215, 0, 0) 70%)`,
          borderRadius: '50%',
          filter: 'blur(35px)',
          pointerEvents: 'none'
        }}
      />

      {/* Cinematic Golden Sparkles Rising */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 3
      }}>
        {activeSparks.map((spark, idx) => (
          <motion.div
            key={idx}
            style={{
              position: 'absolute',
              left: spark.left,
              top: spark.top,
              width: `${spark.size}px`,
              height: `${spark.size}px`,
              borderRadius: '50%',
              background: '#ffd700',
              boxShadow: '0 0 6px #ffd700, 0 0 10px #ffffff',
              pointerEvents: 'none'
            }}
            animate={{
              y: [0, -80, 0],
              opacity: [0, 0.85, 0],
              scale: [0.6, 1.3, 0.6]
            }}
            transition={{
              duration: 5.0,
              repeat: Infinity,
              delay: spark.delay,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>

      {/* Floating Graduation Cap SVG */}
      <svg
        viewBox="0 0 400 450"
        fill="none"
        style={{
          width: '94%',
          height: '94%',
          maxHeight: '430px',
          zIndex: 2,
          filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.15))',
          transition: 'filter 1.2s ease'
        }}
      >
        <defs>
          <linearGradient id="capBoardGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1a2b54" />
            <stop offset="50%" stopColor="#0b1120" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          
          <linearGradient id="goldCapOutline" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffd700" />
            <stop offset="50%" stopColor="#ffb700" />
            <stop offset="100%" stopColor="#b39200" />
          </linearGradient>
          
          <radialGradient id="capShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255, 215, 0, 0.2)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        <g>
          {/* Gravitational Drop Shadow */}
          <motion.ellipse
            cx="200"
            cy="320"
            rx="75"
            ry="15"
            fill="url(#capShadow)"
            animate={{
              rx: [75, 60, 75],
              ry: [15, 12, 15],
              opacity: [0.35 + actualProgress * 0.45, 0.15 + actualProgress * 0.25, 0.35 + actualProgress * 0.45]
            }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Detailed Gold-Glassmorphic Graduation Cap */}
          <motion.g
            animate={{
              y: [0, -10, 0],
              rotate: [-1.5, 1.5, -1.5]
            }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '200px 200px' }}
          >
            {/* Diamond Mortarboard (Board) */}
            <path
              d="M 60,180 L 200,110 L 340,180 L 200,250 Z"
              fill="url(#capBoardGrad)"
              stroke="url(#goldCapOutline)"
              strokeWidth={2.5 + actualProgress * 1.5}
              style={{
                filter: `drop-shadow(0 0 ${4 + actualProgress * 10}px rgba(255, 215, 0, ${0.4 + actualProgress * 0.4}))`
              }}
            />
            
            {/* Accent Border Inset */}
            <path
              d="M 75,180 L 200,123 L 325,180 L 200,237 Z"
              fill="none"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1.2"
            />

            {/* Skull Cap (Under body) */}
            <path
              d="M 130,225 C 130,225 130,285 200,285 C 270,285 270,225 270,225 Q 200,248 130,225 Z"
              fill="#050814"
              stroke="url(#goldCapOutline)"
              strokeWidth="2"
              style={{
                filter: `drop-shadow(0 0 ${3 + actualProgress * 6}px rgba(255, 215, 0, 0.3))`
              }}
            />

            {/* Gold Accent Rim Band */}
            <path
              d="M 130,225 Q 200,248 270,225 L 270,237 Q 200,260 130,237 Z"
              fill="rgba(255, 215, 0, 0.1)"
              stroke="url(#goldCapOutline)"
              strokeWidth="1"
            />

            {/* Cap Button */}
            <circle cx="200" cy="180" r="7" fill="url(#goldCapOutline)" stroke="#000" strokeWidth="1.5" />
            
            {/* Tassel Draped String */}
            <path
              d="M 200,180 Q 130,195 105,230"
              fill="none"
              stroke="url(#goldCapOutline)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Hanging Tassel */}
            <path
              d="M 105,230 Q 98,258 92,282 H 108 Q 106,258 105,230 Z"
              fill="url(#goldCapOutline)"
              stroke="#000000"
              strokeWidth="0.5"
            />
            <line x1="95" y1="275" x2="95" y2="284" stroke="#ffffff" strokeWidth="0.8" />
            <line x1="99" y1="275" x2="99" y2="284" stroke="url(#goldCapOutline)" strokeWidth="0.8" />
            <line x1="103" y1="275" x2="103" y2="284" stroke="#ffffff" strokeWidth="0.8" />
          </motion.g>
        </g>
      </svg>
    </div>
  );
};

export default TreeAnimation;
