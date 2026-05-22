import React, { useState, useEffect, useRef } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface MonthYearPickerProps {
  value: string; // "YYYY-MM" format or empty
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MonthYearPicker: React.FC<MonthYearPickerProps> = ({
  value,
  onChange,
  placeholder = 'Select Date',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial values
  const initialYear = value ? parseInt(value.split('-')[0]) : new Date().getFullYear();
  const initialMonth = value ? parseInt(value.split('-')[1]) - 1 : new Date().getMonth();

  const [currentYear, setCurrentYear] = useState(initialYear);
  
  // Keep year in sync if value changes externally
  useEffect(() => {
    if (value) {
      setCurrentYear(parseInt(value.split('-')[0]));
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMonthSelect = (monthIndex: number) => {
    const formattedMonth = String(monthIndex + 1).padStart(2, '0');
    onChange(`${currentYear}-${formattedMonth}`);
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (!value) return placeholder;
    const [yr, mth] = value.split('-');
    const monthName = MONTHS[parseInt(mth) - 1];
    return `${monthName} ${yr}`;
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="form-input"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(10,10,10,0.7)',
          border: isOpen ? '1px solid var(--color-yellow-primary)' : '1px solid var(--color-border-glass)',
          boxShadow: isOpen ? '0 0 8px rgba(255, 215, 0, 0.2)' : 'none',
          padding: '12px 16px',
          color: value ? '#ffffff' : 'var(--color-text-muted)',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '14px',
          transition: 'all 0.2s ease',
          borderRadius: '8px'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiCalendar style={{ color: value ? 'var(--color-yellow-primary)' : 'var(--color-text-muted)' }} />
          {getDisplayText()}
        </span>
      </button>

      {isOpen && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            width: '280px',
            marginBottom: '8px',
            padding: '16px',
            zIndex: 1000,
            background: 'rgba(10, 10, 10, 0.95)',
            border: '1px solid var(--color-border-glass-hover)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
            borderRadius: '12px',
            backdropFilter: 'blur(20px)',
            transform: 'scale(1)',
            transformOrigin: 'bottom left',
            animation: 'pickerFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Year Navigator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            borderBottom: '1px solid rgba(255,215,0,0.1)',
            paddingBottom: '10px'
          }}>
            <button
              type="button"
              onClick={() => setCurrentYear(prev => prev - 1)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,215,0,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <FiChevronLeft size={16} />
            </button>
            <span style={{
              fontWeight: 700,
              fontSize: '16px',
              color: 'var(--color-yellow-primary)',
              letterSpacing: '0.5px'
            }}>
              {currentYear}
            </span>
            <button
              type="button"
              onClick={() => setCurrentYear(prev => prev + 1)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,215,0,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <FiChevronRight size={16} />
            </button>
          </div>

          {/* Months Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px'
          }}>
            {MONTHS.map((m, index) => {
              const isSelected = value === `${currentYear}-${String(index + 1).padStart(2, '0')}`;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleMonthSelect(index)}
                  style={{
                    padding: '8px 4px',
                    fontSize: '12px',
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--color-yellow-primary)' : 'rgba(255, 255, 255, 0.03)',
                    color: isSelected ? '#000000' : '#e0e0e0',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.color = '#e0e0e0';
                    }
                  }}
                >
                  {m.substring(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pickerFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(5px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
