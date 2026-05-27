import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiZoomIn, FiZoomOut, FiMaximize, FiPlay, FiPause, FiVolume2, FiVolumeX, FiSkipBack, FiSkipForward } from 'react-icons/fi';

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'image' | 'video';
}

export const MediaModal: React.FC<MediaModalProps> = ({ isOpen, onClose, mediaUrl, mediaType }) => {
  const [scale, setScale] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setScale(1);
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (mediaType === 'video' && videoRef.current) {
        if (e.key === ' ') {
          e.preventDefault();
          togglePlay();
        } else if (e.key === 'ArrowRight') {
          videoRef.current.currentTime += 5;
        } else if (e.key === 'ArrowLeft') {
          videoRef.current.currentTime -= 5;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mediaType]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = (value / 100) * videoRef.current.duration;
      setProgress(value);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    if (videoRef.current) {
      videoRef.current.volume = value;
      videoRef.current.muted = value === 0;
      setIsMuted(value === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      if (newMuted) {
        setVolume(0);
      } else {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)'
        }}
        onClick={onClose}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#fff',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 100000,
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          <FiX size={24} />
        </button>

        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            maxWidth: isFullscreen ? '100%' : '90%',
            maxHeight: isFullscreen ? '100%' : '90%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            background: isFullscreen ? '#000' : 'transparent'
          }}
        >
          {mediaType === 'image' ? (
            <div 
              style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
              onWheel={(e) => {
                if (e.deltaY < 0) setScale(s => Math.min(4, s + 0.2));
                else setScale(s => Math.max(1, s - 0.2));
              }}
            >
              <motion.img
                src={mediaUrl}
                alt="Fullscreen Media"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  cursor: scale > 1 ? 'grab' : 'zoom-in',
                  zIndex: 1
                }}
                animate={{ scale }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                drag={scale > 1}
                dragConstraints={{ left: -300, right: 300, top: -300, bottom: 300 }}
                onDoubleClick={() => setScale(scale === 1 ? 2 : 1)}
              />
              {/* Image Controls */}
              <div style={{
                position: 'absolute',
                bottom: '20px',
                display: 'flex',
                gap: '12px',
                background: 'rgba(0,0,0,0.6)',
                padding: '10px 20px',
                borderRadius: '24px',
                backdropFilter: 'blur(8px)',
                zIndex: 10,
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(1, s - 0.5)); }} style={controlBtnStyle}>
                  <FiZoomOut size={20} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(4, s + 0.5)); }} style={controlBtnStyle}>
                  <FiZoomIn size={20} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} style={controlBtnStyle}>
                  <FiMaximize size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="video-container">
              <video
                ref={videoRef}
                src={mediaUrl}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration);
                    videoRef.current.play();
                    setIsPlaying(true);
                  }
                }}
                onClick={togglePlay}
                loop
              />
              
              {/* Custom Video Controls */}
              <div style={{
                position: 'absolute',
                bottom: isFullscreen ? '0' : '20px',
                left: isFullscreen ? '0' : '50%',
                transform: isFullscreen ? 'none' : 'translateX(-50%)',
                width: isFullscreen ? '100%' : '90%',
                maxWidth: '800px',
                background: 'rgba(10,10,10,0.85)',
                padding: '16px 24px',
                borderRadius: isFullscreen ? '0' : '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                backdropFilter: 'blur(10px)',
                border: isFullscreen ? 'none' : '1px solid rgba(255,215,0,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                transition: 'opacity 0.3s'
              }}
              className="custom-video-controls"
              >
                {/* Progress Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                  <span style={{ color: '#fff', fontSize: '12px', minWidth: '40px' }}>
                    {formatTime(videoRef.current?.currentTime || 0)}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={handleSeek}
                    style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: `linear-gradient(to right, var(--color-yellow-primary) ${progress}%, rgba(255,255,255,0.2) ${progress}%)`,
                      WebkitAppearance: 'none',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                    className="video-progress"
                  />
                  <span style={{ color: '#fff', fontSize: '12px', minWidth: '40px' }}>
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Bottom Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <button onClick={() => { if(videoRef.current) videoRef.current.currentTime -= 5; }} style={controlBtnStyle}>
                      <FiSkipBack size={18} />
                    </button>
                    <button onClick={togglePlay} style={{ ...controlBtnStyle, background: 'var(--color-yellow-primary)', color: '#000', padding: '10px' }}>
                      {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} style={{ marginLeft: '2px' }} />}
                    </button>
                    <button onClick={() => { if(videoRef.current) videoRef.current.currentTime += 5; }} style={controlBtnStyle}>
                      <FiSkipForward size={18} />
                    </button>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                      <button onClick={toggleMute} style={controlBtnStyle}>
                        {isMuted || volume === 0 ? <FiVolumeX size={18} /> : <FiVolume2 size={18} />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={handleVolumeChange}
                        style={{
                          width: '60px',
                          height: '4px',
                          background: `linear-gradient(to right, var(--color-yellow-primary) ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%)`,
                          WebkitAppearance: 'none',
                          cursor: 'pointer'
                        }}
                        className="volume-slider"
                      />
                    </div>
                  </div>

                  <button onClick={toggleFullscreen} style={controlBtnStyle}>
                    <FiMaximize size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
        <style>{`
          .video-progress::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--color-yellow-primary);
            cursor: pointer;
            box-shadow: 0 0 5px rgba(255,215,0,0.5);
          }
          .volume-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--color-yellow-primary);
            cursor: pointer;
          }
          .custom-video-controls {
            opacity: 1;
          }
          .video-container:not(:hover) .custom-video-controls {
            opacity: 0;
            pointer-events: none;
          }
        `}</style>
      </div>
    </AnimatePresence>
  );
};

const controlBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#fff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px',
  borderRadius: '50%',
  transition: 'transform 0.2s, background 0.2s'
};
