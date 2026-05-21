import React from 'react';
import { motion } from 'framer-motion';

interface TreeAnimationProps {
  progress: number; // 0.0 to 1.0
  isLoggedIn: boolean;
}

export const TreeAnimation = ({ progress, isLoggedIn }: TreeAnimationProps) => {
  const actualProgress = isLoggedIn ? 1.0 : progress;

  // Knowledge particles — more appear as progress increases
  const particleCount = Math.floor(5 + actualProgress * 15);
  const allParticles = [
    { left: '30%', top: '55%', delay: 0.1, size: 3, symbol: '✦' },
    { left: '70%', top: '50%', delay: 0.5, size: 4, symbol: '◆' },
    { left: '40%', top: '45%', delay: 0.9, size: 3, symbol: '★' },
    { left: '60%', top: '40%', delay: 1.3, size: 5, symbol: '✦' },
    { left: '35%', top: '35%', delay: 0.3, size: 4, symbol: '◇' },
    { left: '65%', top: '30%', delay: 0.7, size: 3, symbol: '✦' },
    { left: '50%', top: '25%', delay: 1.1, size: 5, symbol: '★' },
    { left: '45%', top: '60%', delay: 1.5, size: 3, symbol: '◆' },
    { left: '55%', top: '55%', delay: 0.2, size: 4, symbol: '✦' },
    { left: '25%', top: '48%', delay: 0.6, size: 3, symbol: '◇' },
    { left: '75%', top: '42%', delay: 1.0, size: 4, symbol: '★' },
    { left: '42%', top: '30%', delay: 1.4, size: 3, symbol: '✦' },
    { left: '58%', top: '28%', delay: 0.4, size: 5, symbol: '◆' },
    { left: '48%', top: '20%', delay: 0.8, size: 4, symbol: '★' },
    { left: '52%', top: '18%', delay: 1.2, size: 3, symbol: '✦' },
    { left: '38%', top: '65%', delay: 1.6, size: 4, symbol: '◇' },
    { left: '62%', top: '62%', delay: 0.0, size: 5, symbol: '★' },
    { left: '33%', top: '38%', delay: 1.8, size: 3, symbol: '✦' },
    { left: '67%', top: '35%', delay: 0.9, size: 4, symbol: '◆' },
    { left: '50%', top: '15%', delay: 1.7, size: 5, symbol: '★' },
  ];

  const activeParticles = allParticles.slice(0, particleCount);

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
          background: radial-gradient(ellipse at center bottom, #0d0a04 0%, #030303 60%, #000000 100%);
          border-right: 1px solid rgba(255, 215, 0, 0.05);
        }
      `}</style>

      {/* Ambient warm glow behind the book */}
      <motion.div
        animate={{
          scale: [0.9, 1.1, 0.9],
          opacity: [0.25, 0.45, 0.25]
        }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: `${220 + actualProgress * 140}px`,
          height: `${220 + actualProgress * 140}px`,
          background: `radial-gradient(circle, rgba(255, 200, 50, ${0.1 + actualProgress * 0.15}) 0%, rgba(255, 215, 0, 0) 70%)`,
          borderRadius: '50%',
          filter: 'blur(40px)',
          pointerEvents: 'none',
          bottom: '15%'
        }}
      />

      {/* Secondary upper glow */}
      <motion.div
        animate={{
          scale: [1.0, 1.15, 1.0],
          opacity: [0.1, 0.25, 0.1]
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{
          position: 'absolute',
          width: '180px',
          height: '180px',
          background: `radial-gradient(circle, rgba(255, 215, 0, ${0.08 + actualProgress * 0.12}) 0%, rgba(255, 215, 0, 0) 70%)`,
          borderRadius: '50%',
          filter: 'blur(30px)',
          pointerEvents: 'none',
          top: '20%'
        }}
      />

      {/* Rising knowledge sparkle particles */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 3
      }}>
        {activeParticles.map((p, idx) => (
          <motion.div
            key={idx}
            style={{
              position: 'absolute',
              left: p.left,
              top: p.top,
              fontSize: `${p.size + 6}px`,
              color: '#ffd700',
              textShadow: '0 0 8px rgba(255, 215, 0, 0.6)',
              pointerEvents: 'none'
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 0.8, 0],
              scale: [0.5, 1.2, 0.5],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeInOut'
            }}
          >
            {p.symbol}
          </motion.div>
        ))}
      </div>

      {/* Main 3D Open Book SVG */}
      <svg
        viewBox="0 0 400 400"
        fill="none"
        style={{
          width: '88%',
          height: '88%',
          maxHeight: '400px',
          zIndex: 2,
          filter: `drop-shadow(0 0 ${15 + actualProgress * 20}px rgba(255, 215, 0, ${0.1 + actualProgress * 0.15}))`,
          transition: 'filter 1s ease'
        }}
      >
        <defs>
          {/* Book cover gradient */}
          <linearGradient id="bookCoverL" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1a1408" />
            <stop offset="50%" stopColor="#2a1e0a" />
            <stop offset="100%" stopColor="#1a1408" />
          </linearGradient>
          <linearGradient id="bookCoverR" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1408" />
            <stop offset="50%" stopColor="#2a1e0a" />
            <stop offset="100%" stopColor="#1a1408" />
          </linearGradient>

          {/* Page gradient */}
          <linearGradient id="pageGradL" x1="0" y1="0" x2="1" y2="0.5">
            <stop offset="0%" stopColor="#f5f0e0" />
            <stop offset="100%" stopColor="#e8dfc8" />
          </linearGradient>
          <linearGradient id="pageGradR" x1="1" y1="0" x2="0" y2="0.5">
            <stop offset="0%" stopColor="#f5f0e0" />
            <stop offset="100%" stopColor="#e8dfc8" />
          </linearGradient>

          {/* Gold accent gradient */}
          <linearGradient id="goldAccent" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffd700" />
            <stop offset="50%" stopColor="#ffb700" />
            <stop offset="100%" stopColor="#c9a200" />
          </linearGradient>

          {/* Page glow */}
          <radialGradient id="pageGlow" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor={`rgba(255, 215, 0, ${0.15 + actualProgress * 0.25})`} />
            <stop offset="100%" stopColor="rgba(255, 215, 0, 0)" />
          </radialGradient>

          {/* Book shadow */}
          <radialGradient id="bookShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`rgba(255, 200, 50, ${0.15 + actualProgress * 0.2})`} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        <g>
          {/* Shadow below book */}
          <motion.ellipse
            cx="200"
            cy="310"
            rx="90"
            ry="18"
            fill="url(#bookShadow)"
            animate={{
              rx: [90, 75, 90],
              ry: [18, 14, 18],
              opacity: [0.4 + actualProgress * 0.4, 0.2 + actualProgress * 0.2, 0.4 + actualProgress * 0.4]
            }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Floating book group */}
          <motion.g
            animate={{
              y: [0, -8, 0],
              rotate: [-0.5, 0.5, -0.5]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '200px 220px' }}
          >
            {/* Book spine */}
            <rect x="195" y="180" width="10" height="100" rx="2" fill="#3a2a10" stroke="url(#goldAccent)" strokeWidth="1" />

            {/* LEFT BOOK COVER */}
            <path
              d="M 80,175 Q 80,170 85,168 L 195,178 L 195,280 L 85,270 Q 80,269 80,265 Z"
              fill="url(#bookCoverL)"
              stroke="url(#goldAccent)"
              strokeWidth={1.5 + actualProgress * 0.5}
            />

            {/* LEFT PAGE */}
            <path
              d="M 90,178 L 195,187 L 195,272 L 90,263 Z"
              fill="url(#pageGradL)"
              opacity={0.92}
            />

            {/* Left page text lines */}
            <line x1="100" y1="200" x2="180" y2="207" stroke="rgba(80,60,30,0.3)" strokeWidth="1" />
            <line x1="100" y1="210" x2="175" y2="216" stroke="rgba(80,60,30,0.25)" strokeWidth="1" />
            <line x1="100" y1="220" x2="170" y2="225" stroke="rgba(80,60,30,0.2)" strokeWidth="1" />
            <line x1="100" y1="230" x2="165" y2="234" stroke="rgba(80,60,30,0.3)" strokeWidth="1" />
            <line x1="100" y1="240" x2="178" y2="245" stroke="rgba(80,60,30,0.2)" strokeWidth="1" />
            <line x1="100" y1="250" x2="160" y2="254" stroke="rgba(80,60,30,0.15)" strokeWidth="1" />

            {/* RIGHT BOOK COVER */}
            <path
              d="M 320,175 Q 320,170 315,168 L 205,178 L 205,280 L 315,270 Q 320,269 320,265 Z"
              fill="url(#bookCoverR)"
              stroke="url(#goldAccent)"
              strokeWidth={1.5 + actualProgress * 0.5}
            />

            {/* RIGHT PAGE */}
            <path
              d="M 310,178 L 205,187 L 205,272 L 310,263 Z"
              fill="url(#pageGradR)"
              opacity={0.92}
            />

            {/* Right page text lines */}
            <line x1="220" y1="200" x2="300" y2="194" stroke="rgba(80,60,30,0.3)" strokeWidth="1" />
            <line x1="220" y1="210" x2="295" y2="205" stroke="rgba(80,60,30,0.25)" strokeWidth="1" />
            <line x1="220" y1="220" x2="290" y2="216" stroke="rgba(80,60,30,0.2)" strokeWidth="1" />
            <line x1="220" y1="230" x2="285" y2="227" stroke="rgba(80,60,30,0.3)" strokeWidth="1" />
            <line x1="220" y1="240" x2="298" y2="236" stroke="rgba(80,60,30,0.2)" strokeWidth="1" />
            <line x1="220" y1="250" x2="280" y2="247" stroke="rgba(80,60,30,0.15)" strokeWidth="1" />

            {/* Gold corner accents on book covers */}
            <path d="M 82,175 L 82,185 L 92,178" fill="none" stroke="url(#goldAccent)" strokeWidth="1.5" />
            <path d="M 82,265 L 82,255 L 92,260" fill="none" stroke="url(#goldAccent)" strokeWidth="1.5" />
            <path d="M 318,175 L 318,185 L 308,178" fill="none" stroke="url(#goldAccent)" strokeWidth="1.5" />
            <path d="M 318,265 L 318,255 L 308,260" fill="none" stroke="url(#goldAccent)" strokeWidth="1.5" />

            {/* Glowing page emission light */}
            <rect x="90" y="185" width="220" height="82" rx="4" fill="url(#pageGlow)" opacity={0.5 + actualProgress * 0.4} />
          </motion.g>

          {/* Floating lamp of knowledge above book */}
          <motion.g
            animate={{
              y: [0, -6, 0],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          >
            {/* Lamp flame glow */}
            <motion.ellipse
              cx="200"
              cy="120"
              rx={20 + actualProgress * 15}
              ry={25 + actualProgress * 18}
              fill={`rgba(255, 200, 50, ${0.06 + actualProgress * 0.1})`}
              animate={{
                rx: [20 + actualProgress * 15, 25 + actualProgress * 18, 20 + actualProgress * 15],
                ry: [25 + actualProgress * 18, 30 + actualProgress * 22, 25 + actualProgress * 18],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{ filter: 'blur(12px)' }}
            />

            {/* Lamp body */}
            <path
              d="M 192,155 L 185,140 Q 185,115 200,108 Q 215,115 215,140 L 208,155 Z"
              fill="none"
              stroke="url(#goldAccent)"
              strokeWidth="2"
              style={{ filter: `drop-shadow(0 0 ${4 + actualProgress * 8}px rgba(255, 215, 0, 0.4))` }}
            />

            {/* Lamp flame */}
            <motion.path
              d="M 197,142 Q 200,125 203,142 Q 200,138 197,142 Z"
              fill="#ffd700"
              animate={{
                d: [
                  "M 197,142 Q 200,125 203,142 Q 200,138 197,142 Z",
                  "M 196,142 Q 200,120 204,142 Q 200,136 196,142 Z",
                  "M 197,142 Q 200,125 203,142 Q 200,138 197,142 Z"
                ],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ filter: 'drop-shadow(0 0 6px #ffd700)' }}
            />

            {/* Lamp base */}
            <rect x="190" y="155" width="20" height="4" rx="2" fill="url(#goldAccent)" />
            <line x1="200" y1="159" x2="200" y2="172" stroke="url(#goldAccent)" strokeWidth="2" />
            <rect x="188" y="172" width="24" height="3" rx="1.5" fill="url(#goldAccent)" opacity="0.7" />
          </motion.g>

          {/* Small decorative quote marks */}
          <motion.text
            x="140"
            y="155"
            fill="rgba(255, 215, 0, 0.3)"
            fontSize="28"
            fontFamily="Georgia, serif"
            fontStyle="italic"
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            "
          </motion.text>
          <motion.text
            x="248"
            y="155"
            fill="rgba(255, 215, 0, 0.3)"
            fontSize="28"
            fontFamily="Georgia, serif"
            fontStyle="italic"
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          >
            "
          </motion.text>
        </g>
      </svg>
    </div>
  );
};

export default TreeAnimation;
