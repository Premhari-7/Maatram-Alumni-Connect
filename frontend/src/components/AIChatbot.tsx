import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageSquare, FiX, FiSend, FiCpu } from 'react-icons/fi';
import { useAuth, API_URL } from '../context/AuthContext';
import axios from 'axios';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export const AIChatbot = () => {
  const { user, token } = useAuth();
  const isMockMode = false;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: 'Hello, I’m Maatram Jarvis! How can I assist you with the Maatram Foundation or this platform today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Don't show chatbot if not logged in
  if (!user) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setInput('');
    
    // Add user message
    setMessages(prev => [
      ...prev,
      { sender: 'user', text: userText, timestamp: new Date() }
    ]);

    setIsTyping(true);

    if (isMockMode) {
      // Simulate mock chatbot reply locally offline
      setTimeout(() => {
        setIsTyping(false);
        const lower = userText.toLowerCase();
        let reply = '';

        if (lower.includes('who') || lower.includes('about') || lower.includes('maatram') || lower.includes('foundation')) {
          reply = "Maatram Foundation is a registered public charitable trust started in 2013 with the mission of providing free higher education to deserving students from economically deprived backgrounds. This platform, Maatram Alumni Connect, is our premium space for alumni to network, mentor current students, and share career opportunities.";
        } else if (lower.includes('connect') || lower.includes('people') || lower.includes('find') || lower.includes('student') || lower.includes('alumni')) {
          reply = "You can search and connect with other users in the 'Connections' section. Filter by department, skills, batch, or current company. Once you find someone, click 'Connect' to establish a link. You can then chat with them in real-time in the 'Messages' section.";
        } else if (lower.includes('event') || lower.includes('meet') || lower.includes('workshop') || lower.includes('webinar')) {
          reply = "In the 'Events' section, you will find information about upcoming webinars, alumni meets, workshops, and foundation programs. You can register with a single click, see who else is attending, and read any announcements posted by administrators.";
        } else if (lower.includes('post') || lower.includes('feed') || lower.includes('like') || lower.includes('comment')) {
          reply = "The 'Feed' tab is the social hub of the platform. You can create text posts, upload images, read updates from the community, like, comment, and save posts to read later.";
        } else if (lower.includes('career') || lower.includes('job') || lower.includes('mentor') || lower.includes('resume') || lower.includes('guidance')) {
          reply = "We encourage students to seek mentorship from alumni! Search for alumni in the 'Connections' section who work at target companies or share your skills. Initiate a connection and send a message. You can also view and register for professional webinars and career guidance sessions in the 'Events' panel.";
        } else if (lower.includes('admin') || lower.includes('verify') || lower.includes('status')) {
          reply = "Alumni signups require verification by administrators to maintain community integrity. Once verified, you will gain full access to alumni networking and posting. Admins can manage all verification requests, edit events, and moderate content from their dedicated Admin Panel.";
        } else {
          reply = "Thank you for reaching out. I am Maatram Jarvis. I can guide you through using the platform or answer questions about the Maatram Foundation. You can check the 'Feed' to see updates, 'Connections' to find alumni, 'Events' to register for webinars, and 'Messages' to chat in real-time. What would you like to explore?";
        }

        // Clean out emojis if any sneaked in
        reply = reply.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "");

        setMessages(prev => [
          ...prev,
          { sender: 'bot', text: reply, timestamp: new Date() }
        ]);
      }, 1500);
    } else {
      // Direct call to backend chat route
      try {
        const res = await axios.post(`${API_URL}/chatbot`, { message: userText }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setIsTyping(false);
        setMessages(prev => [
          ...prev,
          { sender: 'bot', text: res.data.reply, timestamp: new Date() }
        ]);
      } catch (err) {
        console.error('Chatbot API error:', err);
        setIsTyping(false);
        setMessages(prev => [
          ...prev,
          { sender: 'bot', text: 'Apologies, I encountered an error connecting to the AI services. Please try again shortly.', timestamp: new Date() }
        ]);
      }
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '25px', right: '25px', zIndex: 9999 }}>
      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'var(--color-yellow-primary)',
          color: '#000000',
          border: 'none',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(255, 215, 0, 0.3)',
          outline: 'none'
        }}
      >
        {isOpen ? <FiX size={24} /> : <FiMessageSquare size={24} />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}
            className="glass-panel"
            style={{
              position: 'absolute',
              bottom: '72px',
              right: 0,
              width: 'calc(100vw - 50px)',
              maxWidth: '320px',
              height: '420px',
              maxHeight: 'calc(100vh - 120px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid var(--color-yellow-primary)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7)'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px',
              borderBottom: '1px solid var(--color-border-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0,0,0,0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: 'var(--color-yellow-primary)',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000000'
                }}>
                  <FiCpu size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                    Maatram Jarvis
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--color-yellow-primary)',
                      boxShadow: '0 0 6px var(--color-yellow-primary)'
                    }} />
                    <span style={{ fontSize: '10px', color: 'var(--color-text-gray)' }}>Online Helper</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-gray)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Chat Messages */}
            <div style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    fontFamily: 'var(--font-body)',
                    background: msg.sender === 'user' ? 'var(--color-yellow-primary)' : 'rgba(30, 30, 30, 0.7)',
                    color: msg.sender === 'user' ? '#000000' : '#ffffff',
                    border: msg.sender === 'user' ? 'none' : '1px solid var(--color-border-glass)',
                    boxShadow: msg.sender === 'user' ? '0 4px 10px rgba(255, 215, 0, 0.15)' : 'none',
                    borderTopRightRadius: msg.sender === 'user' ? '2px' : '12px',
                    borderTopLeftRadius: msg.sender === 'bot' ? '2px' : '12px'
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '4px', padding: '10px 14px', background: 'rgba(30, 30, 30, 0.7)', borderRadius: '12px', border: '1px solid var(--color-border-glass)' }}>
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-yellow-primary)' }} />
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-yellow-primary)' }} />
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-yellow-primary)' }} />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSend}
              style={{
                padding: '12px',
                borderTop: '1px solid var(--color-border-glass)',
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                gap: '8px'
              }}
            >
              <input
                type="text"
                placeholder="Ask me something..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(20, 20, 20, 0.8)',
                  border: '1px solid var(--color-border-glass)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'var(--color-yellow-primary)',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '8px',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <FiSend size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
