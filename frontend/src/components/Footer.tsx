import React, { useState, useEffect } from 'react';
import { FiPhone, FiMail, FiMapPin, FiFacebook, FiInstagram, FiHeart } from 'react-icons/fi';

interface FooterProps {
  minimal?: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  speed: number;
  opacity: number;
}

export const Footer = ({ minimal = false }: FooterProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);

  const triggerCelebration = () => {
    // Spawn 35 custom golden/white celebration sparks radiating outwards
    const newParticles: Particle[] = [];
    for (let i = 0; i < 35; i++) {
      newParticles.push({
        id: Date.now() + i + Math.random(),
        x: 0,
        y: 0,
        color: ['#ffd700', '#ffdf00', '#ffc700', '#ffffff'][Math.floor(Math.random() * 4)],
        size: Math.random() * 5 + 3,
        angle: Math.random() * 360,
        speed: Math.random() * 5 + 3,
        opacity: 1
      });
    }
    setParticles(newParticles);
    setShowCelebration(true);

    // Reset celebration state after a duration
    setTimeout(() => {
      setShowCelebration(false);
    }, 1500);
  };

  // Animate the gold sparks in real-time
  useEffect(() => {
    if (particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles(prev => prev
        .map(p => {
          const rad = (p.angle * Math.PI) / 180;
          return {
            ...p,
            x: p.x + Math.cos(rad) * p.speed,
            y: p.y + Math.sin(rad) * p.speed - 0.4, // drift upwards slightly
            opacity: p.opacity - 0.02,
            speed: p.speed * 0.95 // air friction deceleration
          };
        })
        .filter(p => p.opacity > 0)
      );
    }, 16); // 60 FPS

    return () => clearInterval(interval);
  }, [particles]);

  return (
    <footer style={{
      background: minimal ? 'transparent' : '#020202',
      position: 'relative',
      padding: minimal ? '30px 5%' : '70px 5% 30px 5%',
      borderTop: minimal ? '1px solid rgba(255, 215, 0, 0.03)' : '1px solid rgba(255, 215, 0, 0.08)',
      overflow: 'hidden'
    }}>
      {/* Decorative Golden Ambient Lighting (only in full footer) */}
      {!minimal && (
        <div style={{
          position: 'absolute',
          bottom: '-100px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '50%',
          height: '250px',
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.04) 0%, rgba(255, 215, 0, 0) 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }} />
      )}

      {/* Main footer layout with contact/social detail section (hidden in minimal mode) */}
      {!minimal && (
        <div 
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr',
            gap: '40px',
            position: 'relative',
            zIndex: 2
          }} 
          className="footer-grid"
        >
          {/* Section 1: Reach Us */}
          <div>
            <h3 style={{
              fontSize: '17px',
              color: '#ffffff',
              fontWeight: 800,
              marginBottom: '20px',
              fontFamily: 'var(--font-title)',
              letterSpacing: '1px'
            }}>
              Reach Us
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13.5px', color: 'var(--color-text-gray)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <FiMapPin style={{ color: 'var(--color-yellow-primary)', marginTop: '3px', flexShrink: 0 }} size={16} />
                <span style={{ lineHeight: '1.6' }}>
                  No. 47, 7th Cross Street,<br />
                  Rengareddy Gardens,<br />
                  Neelankarai, Chennai - 600115
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <FiMail style={{ color: 'var(--color-yellow-primary)', flexShrink: 0 }} size={16} />
                <a 
                  href="mailto:enquiry@maatramfoundation.com"
                  style={{ color: 'var(--color-text-gray)', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--color-yellow-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-gray)'}
                >
                  enquiry@maatramfoundation.com
                </a>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <FiPhone style={{ color: 'var(--color-yellow-primary)', marginTop: '3px', flexShrink: 0 }} size={16} />
                <span style={{ lineHeight: '1.6' }}>
                  +91 9551014389 / 8925927943 / 8925927948 / 8925927944 / 7358290637
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Follow Us */}
          <div>
            <h3 style={{
              fontSize: '17px',
              color: '#ffffff',
              fontWeight: 800,
              marginBottom: '20px',
              fontFamily: 'var(--font-title)',
              letterSpacing: '1px'
            }}>
              Follow Up
            </h3>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <a 
                href="https://www.facebook.com/people/Maatram-Foundation/100066813833460/#" 
                target="_blank" 
                rel="noopener noreferrer"
                className="glass-panel"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  transition: 'all 0.3s ease',
                  borderColor: 'rgba(255, 215, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-yellow-primary)';
                  e.currentTarget.style.color = 'var(--color-yellow-primary)';
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.1)';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }}
              >
                <FiFacebook size={18} />
              </a>

              <a 
                href="https://www.instagram.com/maatram_alumni_association/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="glass-panel"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  transition: 'all 0.3s ease',
                  borderColor: 'rgba(255, 215, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-yellow-primary)';
                  e.currentTarget.style.color = 'var(--color-yellow-primary)';
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.1)';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }}
              >
                <FiInstagram size={18} />
              </a>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-title)', letterSpacing: '2px' }}>
                மாற்றம்
              </span>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Maatram Alumni Connect
              </span>
            </div>
          </div>

          {/* Section 3: Premium SVGs Decoration */}
          <div style={{
            position: 'relative',
            height: '100%',
            minHeight: '140px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }} className="footer-deco-container">
            <svg
              viewBox="0 0 200 160"
              fill="none"
              style={{
                width: '100%',
                maxWidth: '180px',
                height: 'auto',
                overflow: 'visible'
              }}
            >
              <path
                d="M 10 140 C 20 120, 50 120, 70 130 C 85 110, 125 110, 140 125 C 160 115, 190 125, 195 145 Z"
                fill="rgba(255, 170, 0, 0.12)"
              />
              <path
                d="M 40 145 C 55 130, 85 130, 100 138 C 115 125, 145 125, 160 138 Z"
                fill="rgba(255, 215, 0, 0.15)"
              />

              {/* Glowing Lightbulb */}
              <g transform="translate(130, 80)">
                <circle cx="20" cy="20" r="24" fill="url(#bulbGlow)" />
                <line x1="20" y1="-8" x2="20" y2="-2" stroke="var(--color-yellow-primary)" strokeWidth="2" strokeLinecap="round" />
                <line x1="-8" y1="20" x2="-2" y2="20" stroke="var(--color-yellow-primary)" strokeWidth="2" strokeLinecap="round" />
                <line x1="42" y1="20" x2="48" y2="20" stroke="var(--color-yellow-primary)" strokeWidth="2" strokeLinecap="round" />
                <line x1="0" y1="0" x2="5" y2="5" stroke="var(--color-yellow-primary)" strokeWidth="2" strokeLinecap="round" />
                <line x1="40" y1="0" x2="35" y2="5" stroke="var(--color-yellow-primary)" strokeWidth="2" strokeLinecap="round" />

                <path d="M 12 30 H 28 L 25 35 H 15 Z" fill="#777777" />
                <rect x="16" y="35" width="8" height="3" rx="1.5" fill="#555555" />
                
                <path
                  d="M 20 5 C 10 5, 8 18, 12 25 C 13 27, 13 30, 16 30 H 24 C 27 30, 27 27, 28 25 C 32 18, 30 5, 20 5 Z"
                  fill="rgba(255, 215, 0, 0.2)"
                  stroke="var(--color-yellow-primary)"
                  strokeWidth="2.5"
                />
                <path
                  d="M 16 23 L 18 15 L 20 18 L 22 15 L 24 23"
                  stroke="var(--color-yellow-primary)"
                  strokeWidth="1.5"
                  fill="none"
                />
              </g>

              {/* Floating Graduation Cap */}
              <g transform="translate(30, 20)">
                <path
                  d="M 15 50 L 50 63 L 85 50 L 50 37 Z"
                  fill="#151515"
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="1"
                />
                <path
                  d="M 15 50 L 50 63 L 85 50 L 50 37 Z"
                  fill="url(#capGrad)"
                />
                <path
                  d="M 33 57 V 65 C 33 71, 67 71, 67 65 V 57"
                  fill="#0f0f0f"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="1"
                />
                
                <circle cx="50" cy="50" r="3.5" fill="var(--color-yellow-primary)" />
                <path
                  d="M 50 50 Q 30 52, 26 65 L 28 76"
                  stroke="var(--color-yellow-primary)"
                  strokeWidth="1.5"
                  fill="none"
                />
                <rect x="25" y="76" width="6" height="10" rx="1" fill="var(--color-yellow-primary)" />
              </g>

              <defs>
                <radialGradient id="bulbGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(255, 215, 0, 0.25)" />
                  <stop offset="100%" stopColor="rgba(255, 215, 0, 0)" />
                </radialGradient>
                <linearGradient id="capGrad" x1="15" y1="37" x2="85" y2="63">
                  <stop offset="0%" stopColor="#2a2a2a" />
                  <stop offset="50%" stopColor="#151515" />
                  <stop offset="100%" stopColor="#050505" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      )}

      {/* Footer Branding Bottom Row - Clean Premium Copyright and Original Developer Credits */}
      <div style={{
        maxWidth: '1200px',
        margin: minimal ? '0 auto' : '40px auto 0 auto',
        paddingTop: '20px',
        borderTop: minimal ? 'none' : '1px solid rgba(255,215,0,0.05)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        position: 'relative'
      }}>
        <div style={{
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-title)',
          letterSpacing: '0.5px'
        }}>
          &copy; {new Date().getFullYear()} Maatram Foundation. All rights reserved.
        </div>

        {/* RESTORED BRANDING BAR: Crafted with React Icon Heart by Prem Hari S */}
        <div style={{
          fontSize: '13px',
          color: 'var(--color-text-gray)',
          fontFamily: 'var(--font-title)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          letterSpacing: '0.5px'
        }}>
          <span>Crafted with</span>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <FiHeart 
              onClick={triggerCelebration}
              style={{ 
                color: '#ffd700', 
                cursor: 'pointer', 
                margin: '0 4px',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                filter: showCelebration ? 'drop-shadow(0 0 8px #ffd700) brightness(1.2)' : 'none',
                transform: showCelebration ? 'scale(1.3)' : 'scale(1)'
              }} 
              className={showCelebration ? 'heart-glow-active' : ''}
              size={15}
            />
            {/* Absolute Particle sparks spawned inside bounds */}
            {particles.map(p => (
              <div
                key={p.id}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px))`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  borderRadius: '50%',
                  background: p.color,
                  opacity: p.opacity,
                  boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                  pointerEvents: 'none',
                  zIndex: 9999
                }}
              />
            ))}
          </div>
          <span>by</span>
          <a 
            href="https://prem-hari-portfolio.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: '#ffd700', 
              textDecoration: 'none', 
              fontWeight: 700, 
              borderBottom: '1px dashed rgba(255, 215, 0, 0.4)', 
              paddingBottom: '1px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderBottomColor = '#ffffff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#ffd700';
              e.currentTarget.style.borderBottomColor = 'rgba(255, 215, 0, 0.4)';
            }}
          >
            Prem Hari S
          </a>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .footer-deco-container svg g {
          animation: float 5s ease-in-out infinite;
        }
        .footer-deco-container svg g:nth-child(even) {
          animation-delay: 2.5s;
        }

        @keyframes popupBurst {
          0% { transform: translate(-50%, 40px) scale(0.85); opacity: 0; }
          100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
        }

        .heart-glow-active {
          animation: heartRipple 0.8s cubic-bezier(0.25, 0.8, 0.25, 1) infinite;
        }

        @keyframes heartRipple {
          0% { transform: scale(1.1); filter: drop-shadow(0 0 2px #ffd700); }
          50% { transform: scale(1.4); filter: drop-shadow(0 0 12px #ffd700); }
          100% { transform: scale(1.1); filter: drop-shadow(0 0 2px #ffd700); }
        }
        
        @media (max-width: 991px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 30px !important;
          }
          .footer-deco-container {
            grid-column: span 2;
            min-height: 100px !important;
          }
        }

        @media (max-width: 576px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
            text-align: center !important;
          }
          .footer-grid > div {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .footer-deco-container {
            grid-column: span 1;
          }
          .footer-grid li a {
            text-align: center;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
