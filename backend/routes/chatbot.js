import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Floating AI Chatbot responder
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const msgLower = message.toLowerCase();

    // Check if Gemini or Groq keys exist in environment
    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (groqKey) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: 'mixtral-8x7b-32768',
            messages: [
              {
                role: 'system',
                content: 'You are Maatram Jarvis, the official AI Assistant for Maatram Alumni Connect and the Maatram Foundation. The Maatram Foundation provides free higher education to deserving students from economically deprived backgrounds. You guide students and alumni with empathy, professionalism, and short, concise answers. Do NOT use emojis.'
              },
              { role: 'user', content: message }
            ]
          })
        });
        const data = await response.json();
        if (data.choices && data.choices[0]?.message?.content) {
          let reply = data.choices[0].message.content;
          reply = reply.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "");
          return res.json({ reply });
        }
      } catch (err) {
        console.error('Groq API call failed, falling back to Gemini/rules:', err);
      }
    }

    if (geminiKey) {
      // We can fetch from Gemini API
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are Maatram Jarvis, the AI Assistant for Maatram Alumni Connect, a premium, futuristic networking platform for Maatram Foundation. 
                       Maatram Foundation provides free higher education to deserving students from economically deprived backgrounds.
                       Your styling and theme is black and yellow. Answer professionally and with empathy. Always identify yourself as Maatram Jarvis. Do not use emojis in your response. Keep it concise.
                       User message: ${message}`
              }]
            }]
          })
        });
        const data = await response.json();
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
          let reply = data.candidates[0].content.parts[0].text;
          // Filter out emojis if any sneaked in
          reply = reply.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "");
          return res.json({ reply });
        }
      } catch (err) {
        console.error('Gemini API call failed, falling back to rules:', err);
      }
    }

    // Rules-based response fallback
    let reply = "";

    if (msgLower.includes('who') || msgLower.includes('about') || msgLower.includes('maatram') || msgLower.includes('foundation')) {
      reply = "Maatram Foundation is a registered public charitable trust started in 2013 with the mission of providing free higher education to deserving students from economically deprived backgrounds. We act as a bridge between partner educational institutions and students who cannot afford higher education. This platform, Maatram Alumni Connect, is our premium space for alumni to network, mentor current students, and share career opportunities.";
    } else if (msgLower.includes('programs') || msgLower.includes('initiatives') || msgLower.includes('support')) {
      reply = "Maatram Foundation leads transformation by providing quality sponsored education, continuous skill development, and employability training. We support students from admissions through their career journeys via structured mentorship programs.";
    } else if (msgLower.includes('founder') || msgLower.includes('team') || msgLower.includes('contact')) {
      reply = "Maatram Foundation was founded by a team of dedicated individuals passionate about education. You can learn more about our core team or contact us directly on our main website at www.maatramfoundation.com.";
    } else if (msgLower.includes('connect') || msgLower.includes('people') || msgLower.includes('find') || msgLower.includes('student') || msgLower.includes('alumni')) {
      reply = "You can search and connect with other users in the 'Connections' section. Filter by department, skills, batch, or current company. Once you find someone, click 'Connect' to establish a link. You can then chat with them in real-time in the 'Messages' section.";
    } else if (msgLower.includes('chat') || msgLower.includes('message') || msgLower.includes('write')) {
      reply = "To start a chat, go to the 'Connections' tab, search for the user, and click 'Connect' or click the chat bubble. Once connected, they will appear in your 'Messages' section where you can exchange real-time messages with typing indicators and online status updates.";
    } else if (msgLower.includes('event') || msgLower.includes('meet') || msgLower.includes('workshop') || msgLower.includes('webinar')) {
      reply = "In the 'Events' section, you will find information about upcoming webinars, alumni meets, workshops, and foundation programs. You can register with a single click, see who else is attending, and read any announcements posted by administrators.";
    } else if (msgLower.includes('post') || msgLower.includes('feed') || msgLower.includes('like') || msgLower.includes('comment')) {
      reply = "The 'Feed' tab is the social hub of the platform. You can create text posts, upload images, read updates from the community, like, comment, and save posts to read later.";
    } else if (msgLower.includes('career') || msgLower.includes('job') || msgLower.includes('mentor') || msgLower.includes('resume') || msgLower.includes('guidance')) {
      reply = "We encourage students to seek mentorship from alumni! Search for alumni in the 'Connections' section who work at target companies or share your skills. Initiate a connection and send a message. You can also view and register for professional webinars and career guidance sessions in the 'Events' panel.";
    } else if (msgLower.includes('admin') || msgLower.includes('verify') || msgLower.includes('status')) {
      reply = "Alumni signups require verification by administrators to maintain community integrity. Once verified, you will gain full access to alumni networking and posting. Admins can manage all verification requests, edit events, and moderate content from their dedicated Admin Panel.";
    } else if (msgLower.includes('hello') || msgLower.includes('hi') || msgLower.includes('hey') || msgLower.includes('greetings')) {
      reply = "Hello, I’m Maatram Jarvis! How can I assist you today? I can help with platform navigation, explain how to register for events, find mentors, or share information about the Maatram Foundation.";
    } else {
      reply = "Thank you for reaching out. I am Maatram Jarvis. I can guide you through using the platform or answer questions about the Maatram Foundation. You can check the 'Feed' to see updates, 'Connections' to find alumni, 'Events' to register for webinars, and 'Messages' to chat in real-time. What would you like to explore?";
    }

    // Double-check no emojis are returned
    reply = reply.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "");

    return res.json({ reply });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ message: 'Chatbot server error' });
  }
});

export default router;
