import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface TiltCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  glowColor?: string;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  style,
  className = '',
  glowColor = 'rgba(255, 215, 0, 0.15)'
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  // Mouse position inside card
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), { damping: 20, stiffness: 150 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), { damping: 20, stiffness: 150 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Relative position normalized between -0.5 and 0.5
    const relativeX = (e.clientX - rect.left) / width - 0.5;
    const relativeY = (e.clientY - rect.top) / height - 0.5;
    
    x.set(relativeX);
    y.set(relativeY);

    // Keep track of pixel position for radial glow
    const glowX = e.clientX - rect.left;
    const glowY = e.clientY - rect.top;
    setMousePos({ x: glowX, y: glowY });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        rotateX,
        rotateY,
        position: 'relative',
        cursor: 'pointer',
        ...style
      }}
      animate={{
        scale: isHovered ? 1.02 : 1,
        z: isHovered ? 20 : 0
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20
      }}
      className={`glass-panel ${className}`}
    >
      {/* Dynamic Mouse-follow Glow Background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 'inherit',
          background: isHovered
            ? `radial-gradient(circle 120px at ${mousePos.x}px ${mousePos.y}px, ${glowColor}, transparent 80%)`
            : 'transparent',
          pointerEvents: 'none',
          zIndex: 1,
          transition: 'background 0.1s ease',
        }}
      />
      
      {/* Inner Content with depth */}
      <div style={{ position: 'relative', zIndex: 2, transform: 'translateZ(10px)' }}>
        {children}
      </div>
    </motion.div>
  );
};

export default TiltCard;
