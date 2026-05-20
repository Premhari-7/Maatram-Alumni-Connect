import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiUsers, FiAward, FiBookOpen, FiActivity, FiMapPin, FiMail, FiPhone, FiCalendar } from 'react-icons/fi';
import { Footer } from '../components/Footer';
import { TiltCard } from '../components/TiltCard';
import { FloatingCapLogo } from '../components/FloatingCapLogo';
import axios from 'axios';
import { API_URL } from '../context/AuthContext';

interface PlatformStats {
  students: number;
  alumni: number;
  totalUsers: number;
  posts: number;
  events: number;
}

interface FeaturedAlumni {
  _id: string;
  name: string;
  profile: {
    bio: string;
    company: string;
    jobTitle: string;
    batch: string;
    avatar: string;
  };
}

interface PublicEvent {
  _id: string;
  title: string;
  description: string;
  type: string;
  date: string;
  location: string;
  registrations: string[];
}

export const LandingPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [featuredAlumni, setFeaturedAlumni] = useState<FeaturedAlumni[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<PublicEvent[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const [statsRes, alumniRes, eventsRes] = await Promise.allSettled([
          axios.get(`${API_URL}/users/public/stats`),
          axios.get(`${API_URL}/users/public/featured-alumni`),
          axios.get(`${API_URL}/users/public/events`)
        ]);

        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
        if (alumniRes.status === 'fulfilled') setFeaturedAlumni(alumniRes.value.data);
        if (eventsRes.status === 'fulfilled') setUpcomingEvents(eventsRes.value.data);
      } catch (err) {
        // Silently handle - landing page will show graceful empty states
      } finally {
        setStatsLoading(false);
      }
    };
    fetchPublicData();
  }, []);

  const handleJoinClick = () => {
    navigate('/login');
  };

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 20 } }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', overflowX: 'hidden' }}>
      
      {/* Top Navbar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: 'rgba(5, 5, 5, 0.75)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 215, 0, 0.08)',
        padding: '16px 5%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FloatingCapLogo size={36} />
            <div>
              <h2 style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '1px', margin: 0 }}>MAATRAM FOUNDATION</h2>
              <span style={{ fontSize: '9px', color: 'var(--color-yellow-primary)', display: 'block' }}>ALUMNI CONNECT</span>
            </div>
          </div>
          
          <nav style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
            <a href="#about" onClick={(e) => handleScroll(e, 'about')} style={{ color: 'var(--color-text-gray)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>About</a>
            <a href="#success" onClick={(e) => handleScroll(e, 'success')} style={{ color: 'var(--color-text-gray)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Community</a>
            <button className="btn-primary" onClick={handleJoinClick} style={{ padding: '8px 18px', fontSize: '13px' }}>
              Portal Login <FiArrowRight />
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        position: 'relative',
        padding: '100px 5% 80px 5%',
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Glow behind */}
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.05) 0%, rgba(255, 215, 0, 0) 70%)',
          top: '10%',
          right: '10%',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }} />

        <div style={{
          maxWidth: '1200px',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.8fr',
          gap: '50px',
          alignItems: 'center',
        }} className="hero-grid">
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
          >
            <motion.span 
              variants={itemVariants} 
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-yellow-primary)',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                border: '1px solid rgba(255,215,0,0.2)',
                padding: '6px 12px',
                borderRadius: '20px',
                alignSelf: 'flex-start',
                background: 'rgba(255,215,0,0.03)'
              }}
            >
              The Change Within
            </motion.span>
            
            <motion.h1 
              variants={itemVariants}
              style={{
                fontSize: '56px',
                fontWeight: 800,
                lineHeight: '1.1',
                letterSpacing: '-1px',
                fontFamily: 'var(--font-title)'
              }}
            >
              MAATRAM ALUMNI <span style={{ color: 'var(--color-yellow-primary)', display: 'block' }}>CONNECT</span>
            </motion.h1>
            
            <motion.p 
              variants={itemVariants}
              style={{
                fontSize: '16px',
                color: 'var(--color-text-gray)',
                lineHeight: '1.7',
                maxWidth: '540px'
              }}
            >
              A unified community of alumni and students dedicated to empowering careers, sharing opportunities, and building a stronger future together.
            </motion.p>
            
            <motion.div variants={itemVariants} style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
              <button className="btn-primary" onClick={handleJoinClick} style={{ padding: '12px 28px', fontSize: '15px' }}>
                Join the Community <FiArrowRight />
              </button>
              <a href="#about" className="btn-outline" style={{ padding: '12px 28px', fontSize: '15px', textDecoration: 'none' }}>
                Explore More
              </a>
            </motion.div>

            {/* Sub-cards */}
            <motion.div 
              variants={itemVariants}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                marginTop: '40px'
              }}
              className="features-subgrid"
            >
              {[
                { name: 'Connect', desc: 'Build meaningful connections', icon: <FiUsers /> },
                { name: 'Learn', desc: 'Share knowledge & experiences', icon: <FiBookOpen /> },
                { name: 'Grow', desc: 'Access opportunities & mentorship', icon: <FiAward /> },
                { name: 'Give Back', desc: 'Support and uplift the community', icon: <FiActivity /> }
              ].map((feat, i) => (
                <TiltCard key={i} style={{ padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ color: 'var(--color-yellow-primary)', fontSize: '20px' }}>{feat.icon}</div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>{feat.name}</h4>
                  <p style={{ fontSize: '10px', color: 'var(--color-text-gray)', lineHeight: '1.4' }}>{feat.desc}</p>
                </TiltCard>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Image/Logo Visual Mock */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, type: 'spring' }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <img 
              src="/landing-tree.png" 
              alt="Transformation through education" 
              style={{
                width: '100%',
                maxWidth: '450px',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.15))'
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" style={{ padding: '80px 5%', borderTop: '1px solid rgba(255,215,0,0.05)', background: 'rgba(10,10,10,0.3)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{ color: 'var(--color-yellow-primary)', fontSize: '12px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase' }}>About The Foundation</span>
            <h2 style={{ fontSize: '36px', fontWeight: 800, marginTop: '8px', fontFamily: 'var(--font-title)' }}>Empowering Through Education</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }} className="about-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-yellow-primary)' }}>Our Vision</h3>
              <p style={{ color: 'var(--color-text-gray)', lineHeight: '1.8' }}>
                Maatram Foundation is a registered public charitable trust. Our mission is to provide free higher education to deserving students from economically deprived backgrounds.
              </p>
              <p style={{ color: 'var(--color-text-gray)', lineHeight: '1.8' }}>
                We work in partnership with leading educational institutions to secure scholarships for engineering, arts, science, and nursing programs. Through rigorous selection and ongoing mentorship, we help students break the cycle of poverty and enter professional careers.
              </p>
            </div>
            
            <div className="glass-panel" style={{ padding: '40px', border: '1px solid rgba(255,215,0,0.1)' }}>
              <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Community Focus</h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <FiUsers style={{ color: 'var(--color-yellow-primary)', fontSize: '20px', marginTop: '3px' }} />
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 600 }}>Active Mentorship</h4>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-gray)' }}>Every scholar is paired with an industry mentor to shape their skills.</p>
                  </div>
                </li>
                <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <FiAward style={{ color: 'var(--color-yellow-primary)', fontSize: '20px', marginTop: '3px' }} />
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 600 }}>Placement Support</h4>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-gray)' }}>Soft skills training and technical interview prep lead to top placements.</p>
                  </div>
                </li>
                <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <FiBookOpen style={{ color: 'var(--color-yellow-primary)', fontSize: '20px', marginTop: '3px' }} />
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 600 }}>Alumni Ecosystem</h4>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-gray)' }}>Graduated scholars return as mentors, sponsors, and community guides.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Alumni Spotlight */}
      <section id="success" style={{ padding: '80px 5%', borderTop: '1px solid rgba(255,215,0,0.05)', background: 'rgba(10,10,10,0.3)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{ color: 'var(--color-yellow-primary)', fontSize: '12px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase' }}>Alumni Spotlight</span>
            <h2 style={{ fontSize: '36px', fontWeight: 800, marginTop: '8px', fontFamily: 'var(--font-title)' }}>Our Community Members</h2>
          </div>

          {featuredAlumni.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(featuredAlumni.length, 3)}, 1fr)`, gap: '24px' }} className="testimonials-grid">
              {featuredAlumni.slice(0, 3).map((alumni) => (
                <TiltCard key={alumni._id} style={{ padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: alumni.profile.avatar ? `url(${alumni.profile.avatar}) center/cover` : 'linear-gradient(135deg, var(--color-yellow-primary), #b8860b)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#000', fontWeight: 800, fontSize: '18px', flexShrink: 0,
                      border: '2px solid rgba(255,215,0,0.3)'
                    }}>
                      {!alumni.profile.avatar && alumni.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-yellow-primary)', margin: 0 }}>{alumni.name}</h4>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {[alumni.profile.jobTitle, alumni.profile.company].filter(Boolean).join(' at ') || 'Alumni'}
                        {alumni.profile.batch ? ` (Batch ${alumni.profile.batch})` : ''}
                      </span>
                    </div>
                  </div>
                  {alumni.profile.bio && (
                    <p style={{ fontStyle: 'italic', fontSize: '14px', color: 'var(--color-text-gray)', lineHeight: '1.7' }}>
                      "{alumni.profile.bio}"
                    </p>
                  )}
                </TiltCard>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px' }} className="glass-panel">
              <FiUsers style={{ fontSize: '40px', color: 'var(--color-yellow-primary)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Community is Growing</h3>
              <p style={{ fontSize: '14px', color: 'var(--color-text-gray)', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
                Alumni profiles will appear here once verified members join and complete their profiles. Be the first to join and share your story.
              </p>
              <button className="btn-primary" onClick={handleJoinClick} style={{ marginTop: '20px', padding: '10px 24px', fontSize: '14px' }}>
                Join Now <FiArrowRight />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Dynamic Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <section style={{ padding: '80px 5%', borderTop: '1px solid rgba(255,215,0,0.05)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <span style={{ color: 'var(--color-yellow-primary)', fontSize: '12px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase' }}>Upcoming Events</span>
              <h2 style={{ fontSize: '36px', fontWeight: 800, marginTop: '8px', fontFamily: 'var(--font-title)' }}>Join Our Next Gathering</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(upcomingEvents.length, 3)}, 1fr)`, gap: '24px' }} className="testimonials-grid">
              {upcomingEvents.map((event) => (
                <TiltCard key={event._id} style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                      color: 'var(--color-yellow-primary)', background: 'rgba(255,215,0,0.08)',
                      padding: '4px 10px', borderRadius: '20px', letterSpacing: '1px',
                      border: '1px solid rgba(255,215,0,0.15)'
                    }}>{event.type}</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-gray)' }}>
                      <FiCalendar style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{event.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-gray)', lineHeight: '1.6' }}>
                    {event.description.length > 120 ? event.description.substring(0, 120) + '...' : event.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{event.location}</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-yellow-primary)' }}>
                      {event.registrations.length} registered
                    </span>
                  </div>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Upgraded Cinematic Footer Section */}
      <Footer />

      {/* CSS overrides for simple animations and layout configurations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 1024px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          .hero-grid > div {
            align-items: center !important;
            justify-content: center !important;
          }
          .features-subgrid {
            justify-content: center !important;
            width: 100% !important;
          }
          .about-grid, .stats-grid, .testimonials-grid, .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 768px) {
          .features-subgrid {
            grid-template-columns: 1fr 1fr !important;
          }
          .hero-grid h1 {
            fontSize: 40px !important;
          }
        }
      `}</style>
    </div>
  );
};
