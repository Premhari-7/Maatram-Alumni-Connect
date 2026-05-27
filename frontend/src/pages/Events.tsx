import React, { useState, useEffect } from 'react';
import { useAuth, API_URL, DEFAULT_AVATAR } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { FiCalendar, FiUser, FiLink, FiTag, FiPlus, FiUsers, FiClock, FiMapPin, FiX, FiTrash2, FiAlertCircle } from 'react-icons/fi';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

interface Event {
  _id: string;
  title: string;
  description: string;
  type: string;
  date: string;
  speaker: string;
  location: string;
  registrations: any[];
}

export const Events = () => {
  const { user, token } = useAuth();
  const isMockMode = false;
  const { showNotification } = useNotification();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [showRegistrationsModal, setShowRegistrationsModal] = useState<Event | null>(null);

  // New Event Form State (Admin only)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('webinar');
  const [date, setDate] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [location, setLocation] = useState('');
  
  // Show Admin Form toggle
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openFormForEdit = (ev: Event) => {
    setTitle(ev.title);
    setDescription(ev.description);
    setType(ev.type);
    setDate(new Date(ev.date).toISOString().slice(0, 16)); // Format for datetime-local
    setSpeaker(ev.speaker);
    setLocation(ev.location);
    setEditingEventId(ev._id);
    setShowAdminForm(true);
  };
  
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('webinar');
    setDate('');
    setSpeaker('');
    setLocation('');
    setEditingEventId(null);
    setShowAdminForm(false);
  };

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
          const joined = ev.registrations.some((r: any) => (r._id || r) === user.id);
          const newList = joined
            ? ev.registrations.filter((r: any) => (r._id || r) !== user.id)
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

  // Create or Update event
  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !date || !speaker || !location) {
      showNotification('Error', 'Please fill all required fields.', 'error');
      return;
    }

    setIsSubmitting(true);
    if (isMockMode) {
      if (editingEventId) {
        const updated = events.map(ev => 
          ev._id === editingEventId 
            ? { ...ev, title, description, type, date: new Date(date).toISOString(), speaker, location }
            : ev
        );
        setEvents(updated);
        localStorage.setItem('mock_db_events', JSON.stringify(updated));
        showNotification('Event Updated', 'The event has been successfully updated.', 'success');
      } else {
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
        showNotification('Event Created', 'Upcoming event has been published successfully.', 'success');
      }
      resetForm();
      setIsSubmitting(false);
    } else {
      try {
        if (editingEventId) {
          const res = await axios.put(`${API_URL}/events/${editingEventId}`, {
            title, description, type, date, speaker, location
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setEvents(prev => prev.map(ev => ev._id === editingEventId ? res.data : ev));
          showNotification('Event Updated', 'The event has been successfully updated.', 'success');
        } else {
          const res = await axios.post(`${API_URL}/events`, {
            title, description, type, date, speaker, location
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setEvents(prev => [res.data, ...prev]);
          showNotification('Event Created', 'Upcoming event has been published successfully.', 'success');
        }
        resetForm();
      } catch (err: any) {
        console.error('Error saving event:', err);
        showNotification('Error', err.response?.data?.message || 'Failed to save event.', 'error');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    const eventId = eventToDelete;
    setEventToDelete(null);
    
    if (isMockMode) {
      const updated = events.filter(ev => ev._id !== eventId);
      setEvents(updated);
      localStorage.setItem('mock_db_events', JSON.stringify(updated));
      showNotification('Event Deleted', 'The event was successfully deleted.', 'success');
    } else {
      try {
        await axios.delete(`${API_URL}/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEvents(prev => prev.filter(ev => ev._id !== eventId));
        showNotification('Event Deleted', 'The event was successfully deleted.', 'success');
      } catch (err: any) {
        console.error('Error deleting event:', err);
        showNotification('Error', err.response?.data?.message || 'Failed to delete event.', 'error');
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
            onClick={() => {
              if (showAdminForm) {
                resetForm();
              } else {
                setShowAdminForm(true);
              }
            }}
            style={{ gap: '8px' }}
          >
            <FiPlus size={18} /> {showAdminForm ? 'Close Form' : 'Create Event'}
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
            {editingEventId ? 'Edit Event' : 'Schedule New Event'}
          </h3>
          
          <form onSubmit={handleSubmitEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="admin-event-form">
            
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
              <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ padding: '10px 24px', opacity: isSubmitting ? 0.7 : 1 }}>
                {isSubmitting ? 'Saving...' : editingEventId ? 'Save Changes' : 'Publish Event'}
              </button>
              <button type="button" className="btn-outline" onClick={resetForm} style={{ padding: '10px 24px' }}>
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
            const isRegistered = user ? ev.registrations.some((r: any) => (r._id || r) === user.id) : false;
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

                    {(user?.role === 'admin' || user?.role === 'alumni') && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            openFormForEdit(ev);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setEventToDelete(ev._id)}
                          style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

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
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      fontSize: '12px', 
                      color: 'var(--color-text-gray)', 
                      cursor: (user?.role === 'admin' || user?.role === 'alumni') ? 'pointer' : 'default' 
                    }}
                    onClick={() => {
                      if (user?.role === 'admin' || user?.role === 'alumni') {
                        setShowRegistrationsModal(ev);
                      }
                    }}
                  >
                    <FiUsers />
                    <span style={{ textDecoration: (user?.role === 'admin' || user?.role === 'alumni') ? 'underline' : 'none' }}>
                      {ev.registrations.length} Registered
                    </span>
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {eventToDelete && (
          <div className="notification-overlay" style={{ zIndex: 10010, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(5px)' }} onClick={() => setEventToDelete(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel"
              style={{
                width: '90%',
                maxWidth: '400px',
                padding: '24px',
                textAlign: 'center',
                border: '1px solid #ff4444',
                boxShadow: '0 10px 40px rgba(255, 68, 68, 0.15)',
                background: 'rgba(10, 10, 10, 0.95)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(255, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                color: '#ff4444'
              }}>
                <FiAlertCircle size={28} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-title)', marginBottom: '12px', color: '#ffffff' }}>
                Delete Event
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--color-text-gray)', lineHeight: '1.5', marginBottom: '24px' }}>
                Are you sure you want to permanently delete this event? This action cannot be undone and registered users will be notified.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEventToDelete(null)}
                  className="btn-outline"
                  style={{ flex: 1, justifyItems: 'center', justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteEvent}
                  className="btn-primary"
                  style={{ flex: 1, background: '#ff4444', borderColor: '#ff4444', color: '#fff', justifyItems: 'center', justifyContent: 'center' }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registered Users Modal */}
      <AnimatePresence>
        {showRegistrationsModal && (
          <div className="notification-overlay" style={{ zIndex: 10010, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(5px)' }} onClick={() => setShowRegistrationsModal(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel"
              style={{
                width: '90%',
                maxWidth: '480px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                padding: '0',
                border: '1px solid var(--color-yellow-primary)',
                boxShadow: '0 10px 40px rgba(255, 215, 0, 0.15)',
                background: 'rgba(10, 10, 10, 0.95)',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-title)', color: '#ffffff' }}>
                    Registered Users
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-gray)', marginTop: '2px' }}>
                    {showRegistrationsModal.title}
                  </p>
                </div>
                <button
                  onClick={() => setShowRegistrationsModal(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                >
                  <FiX size={20} />
                </button>
              </div>
              
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                {showRegistrationsModal.registrations.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-gray)', padding: '20px 0' }}>
                    No users have registered yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {showRegistrationsModal.registrations.map((r: any, idx: number) => {
                      const userId = typeof r === 'string' ? r : r._id;
                      const name = r.name || 'Anonymous User';
                      const email = r.email || 'No email provided';
                      const role = r.role || 'Unknown';
                      const avatar = r.profile?.avatar || DEFAULT_AVATAR;

                      return (
                        <div key={userId || idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <img src={avatar} alt={name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div>
                            <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px' }}>{name}</div>
                            <div style={{ color: 'var(--color-text-gray)', fontSize: '12px' }}>{email}</div>
                            <div style={{ color: 'var(--color-yellow-primary)', fontSize: '10px', textTransform: 'uppercase', marginTop: '4px', fontWeight: 700 }}>{role}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
