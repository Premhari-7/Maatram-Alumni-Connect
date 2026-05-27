import React from 'react';
import { motion } from 'framer-motion';

interface FloatingCapLogoProps {
  size?: number;
}

export const FloatingCapLogo = ({ size = 38 }: FloatingCapLogoProps) => {
  return (
    <div style={{ 
      position: 'relative', 
      width: `${size}px`, 
      height: `${size}px`, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      pointerEvents: 'none'
    }}>
      {/* Gravitational shadow ellipse below */}
      <motion.svg
        width={size}
        height={size}
        style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
      >
        <motion.ellipse
          cx={size / 2}
          cy={size * 1.5}
          rx={size * 0.47}
          ry={size * 0.08}
          fill="rgba(255, 215, 0, 0.15)"
          animate={{
            scaleX: [1, 0.78, 1],
            opacity: [0.3, 0.15, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: 'center' }}
        />
      </motion.svg>

      <motion.div
        animate={{
          y: [0, -6, 0],
          rotate: [-2, 2, -2]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: 'center center', width: '100%', height: '100%' }}
      >
        <img 
          src="/logo-main.png" 
          alt="Maatram Logo" 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 8px rgba(255, 215, 0, 0.3))'
          }} 
        />
      </motion.div>
    </div>
  );
};

export default FloatingCapLogo;
