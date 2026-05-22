import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { FiCalendar, FiUser, FiLink, FiTag, FiPlus, FiUsers, FiClock, FiMapPin } from 'react-icons/fi';
import axios from 'axios';

interface Event {
  _id: string;
  title: string;
  description: string;
  type: string;
  date: string;
  speaker: string;
  location: string;
  registrations: string[];
}

export const Events = () => {
  const { user, token, isMockMode } = useAuth();
  const { showNotification } = useNotification();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // New Event Form State (Admin only)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('webinar');
  const [date, setDate] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [location, setLocation] = useState('');
  
  // Show Admin Form toggle
  const [showAdminForm, setShowAdminForm] = useState(false);

  const fetchEvents = async () => {
    if (isMockMode) {
      const mockEventsStr = localStorage.getItem('mock_db_events');
      if (mockEventsStr) {
        setEvents(JSON.parse(mockEventsStr));
      } else {
        // Start with empty events - admins create events
        setEvents([]);
      }
      setLoading(false);
    } else {
      try {
        const res = await axios.get(`${API_URL}/events`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEvents(res.data);
      } catch (err) {
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [isMockMode]);

  // Handle registration click
  const handleRegisterToggle = async (eventId: string) => {
    if (!user) return;

    if (isMockMode) {
      const updated = events.map(ev => {
        if (ev._id === eventId) {
          const joined = ev.registrations.includes(user.id);
          const newList = joined
            ? ev.registrations.filter(id => id !== user.id)
            : [...ev.registrations, user.id];
          
          showNotification(
            joined ? 'Registration Cancelled' : 'Registration Successful',
            joined ? 'You have cancelled registration.' : 'Check back later for meeting credentials.',
            'success'
          );

          return { ...ev, registrations: newList };
        }
        return ev;
      });
      setEvents(updated);
      localStorage.setItem('mock_db_events', JSON.stringify(updated));
    } else {
      try {
        const res = await axios.post(`${API_URL}/events/register/${eventId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEvents(prev => prev.map(ev => ev._id === eventId ? { ...ev, registrations: res.data.registrations } : ev));
        showNotification('Registration Update', 'Your registration status has been updated.', 'success');
      } catch (err) {
        console.error('Error updating event registration:', err);
      }
    }
  };

  // Create new event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !date || !speaker || !location) return;

    if (isMockMode) {
      const newEv: Event = {
        _id: 'ev_' + Date.now(),
        title,
        description,
        type,
        date: new Date(date).toISOString(),
        speaker,
        location,
        registrations: []
      };

      const updated = [newEv, ...events];
      setEvents(updated);
      localStorage.setItem('mock_db_events', JSON.stringify(updated));

      // Seeding mock notifications for all student users
      try {
        const dbUsersStr = localStorage.getItem('mock_db_users');
        if (dbUsersStr) {
          const allUsers = JSON.parse(dbUsersStr);
          const students = allUsers.filter((u: any) => u.role === 'student');
          
          const notifStr = localStorage.getItem('mock_db_notifications');
          const notifs = notifStr ? JSON.parse(notifStr) : [];
          
          students.forEach((student: any) => {
            notifs.unshift({
              _id: 'notif_ev_' + Date.now() + Math.random(),
              sender: {
                _id: user?.id,
                name: user?.name,
                role: user?.role,
                profile: { avatar: user?.profile?.avatar || '' }
              },
              recipient: student.id || student._id,
              type: 'event',
              text: `posted a new event: "${title}"`,
              isRead: false,
              createdAt: new Date().toISOString()
            });
          });
          localStorage.setItem('mock_db_notifications', JSON.stringify(notifs));
          
          // Dispatch custom event to trigger notification components to re-fetch if they listen
          window.dispatchEvent(new Event('mock_notifications_updated'));
        }
      } catch (err) {
        console.error('Error seeding mock notifications:', err);
      }
      
      // Reset form
      setTitle('');
      setDescription('');
      setDate('');
      setSpeaker('');
      setLocation('');
      setShowAdminForm(false);
      showNotification('Event Created', 'Upcoming event has been published successfully.', 'success');
    } else {
      try {
        const res = await axios.post(`${API_URL}/events`, {
          title, description, type, date, speaker, location
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEvents(prev => [res.data, ...prev]);
        setTitle('');
        setDescription('');
        setDate('');
        setSpeaker('');
        setLocation('');
        setShowAdminForm(false);
        showNotification('Event Created', 'Upcoming event has been published successfully.', 'success');
      } catch (err) {
        console.error('Error creating event:', err);
      }
    }
  };

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      
      {/* Header title block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-title)' }}>
            Events Calendar
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-gray)', marginTop: '4px' }}>
            Browse upcoming webinars, career mentoring sessions, and networking meets.
          </p>
        </div>

        {/* Show event creation form trigger if Admin or Alumni */}
        {(user?.role === 'admin' || user?.role === 'alumni') && (
          <button 
            className="btn-primary" 
            onClick={() => setShowAdminForm(!showAdminForm)}
            style={{ gap: '8px' }}
          >
            <FiPlus size={18} /> {showAdminForm ? 'Show Events' : 'Create Event'}
          </button>
        )}
      </div>

      {/* Admin / Alumni Creator Panel overlay form */}
      {showAdminForm && (user?.role === 'admin' || user?.role === 'alumni') && (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '30px', 
            marginBottom: '35px', 
            borderColor: 'var(--color-yellow-primary)',
            boxShadow: '0 8px 30px rgba(255, 215, 0, 0.08)'
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-title)', marginBottom: '20px', color: '#ffffff' }}>
            Schedule New Event
          </h3>
          
          <form onSubmit={handleCreateEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="admin-event-form">
            
            <div className="form-group">
              <label className="form-label">Event Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Scaling Node.js Backends"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Speaker / Host</label>
              <input
                type="text"
                required
                placeholder="e.g. Priya (Alumni - Product Designer)"
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Event Category</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="form-input"
                style={{ background: 'rgba(10,10,10,0.8)' }}
              >
                <option value="webinar">Webinar</option>
                <option value="workshop">Workshop</option>
                <option value="alumni meet">Alumni Meet</option>
                <option value="career advice">Career Advice</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Date & Time</label>
              <input
                type="datetime-local"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div className="form-group admin-form-span" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Link or Venue Location</label>
              <input
                type="text"
                required
                placeholder="e.g. Meeting Link or Physical Address"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group admin-form-span" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Event Description</label>
              <textarea
                required
                placeholder="Briefly describe what attendees will learn or discuss..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(10,10,10,0.7)',
                  border: '1px solid var(--color-border-glass)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  outline: 'none',
                  resize: 'none',
                  fontSize: '14px',
                  fontFamily: 'var(--font-body)'
                }}
              />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '16px', marginTop: '10px' }} className="admin-form-span">
              <button type="submit" className="btn-primary" style={{ padding: '10px 24px' }}>
                Publish Event
              </button>
              <button type="button" className="btn-outline" onClick={() => setShowAdminForm(false)} style={{ padding: '10px 24px' }}>
                Cancel
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Events Listing */}
      {loading ? (
        <div style={{ color: 'var(--color-text-gray)', fontSize: '14px' }}>Loading events...</div>
      ) : events.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-gray)' }}>
          No scheduled events found. Check back later!
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px'
        }} className="events-grid-layout">
          {events.map((ev) => {
            const isRegistered = user ? ev.registrations.includes(user.id) : false;
            const eventDate = new Date(ev.date);

            return (
              <div
                key={ev._id}
                className="glass-panel hover-card"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  borderColor: 'rgba(255, 215, 0, 0.08)'
                }}
              >
                {/* Header details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 650,
                    textTransform: 'uppercase',
                    color: 'var(--color-yellow-primary)',
                    border: '1px solid rgba(255,215,0,0.2)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(255,215,0,0.03)'
                  }}>
                    {ev.type}
                  </span>

                  <span style={{ fontSize: '11px', color: 'var(--color-text-gray)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiClock /> {eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
                    {ev.title}
                  </h3>
                  <p style={{ fontSize: '13.5px', color: 'var(--color-text-gray)', lineHeight: '1.6' }}>
                    {ev.description}
                  </p>
                </div>

                {/* Speaker & Venue Link indicators */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border-glass)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiUser style={{ color: 'var(--color-yellow-primary)' }} />
                    <span>Host: <strong style={{ color: '#ffffff' }}>{ev.speaker}</strong></span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {ev.location.startsWith('http') ? (
                      <>
                        <FiLink style={{ color: 'var(--color-yellow-primary)' }} />
                        <a href={ev.location} target="_blank" rel="noreferrer" style={{ color: 'var(--color-yellow-primary)', textDecoration: 'none' }}>
                          Join Virtual Meeting
                        </a>
                      </>
                    ) : (
                      <>
                        <FiMapPin style={{ color: 'var(--color-yellow-primary)' }} />
                        <span>Venue: <strong style={{ color: '#ffffff' }}>{ev.location}</strong></span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action panel footer */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 'auto',
                  borderTop: '1px solid var(--color-border-glass)',
                  paddingTop: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-gray)' }}>
                    <FiUsers />
                    <span>{ev.registrations.length} Registered</span>
                  </div>

                  <button
                    onClick={() => handleRegisterToggle(ev._id)}
                    style={{
                      padding: '8px 18px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      background: isRegistered ? 'rgba(255, 68, 68, 0.1)' : 'var(--color-yellow-primary)',
                      color: isRegistered ? '#ff4444' : '#000000',
                      border: isRegistered ? '1px solid rgba(255, 68, 68, 0.2)' : '1px solid transparent'
                    }}
                  >
                    {isRegistered ? 'Leave Event' : 'Register now'}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .events-grid-layout {
            grid-template-columns: 1fr !important;
          }
          .admin-event-form {
            grid-template-columns: 1fr !important;
          }
          .admin-form-span {
            grid-column: span 1 !important;
          }
        }
      `}</style>

    </div>
  );
};
export default Events;
