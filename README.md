# Maatram Alumni Connect

A futuristic, premium full-stack alumni networking and community ecosystem built specifically for the **Maatram Foundation**. Inspired by modern LinkedIn and designed with the high-tech aesthetics of **The Bumblebee**, this platform combines glassmorphism, glowing micro-animations, real-time communications, and AI integration to deliver a premium community feel.

---

## 🌟 Key Features

1. **Futuristic Branding**: Stunning black and yellow theme using custom glassmorphism and modern professional typography.
2. **Real-time Social Feed**: Share insights, job opportunities, success stories, and engage with posts without page refreshes.
3. **Smart Filters**: Search alumni by skills, company, department, batch, or role to build high-quality connections.
4. **Interactive Dashboard**: Track your posts, saved items, upcoming events, and access the dedicated Admin panel.
5. **Real-time Chat**: Connect with alumni or students instantly with direct messaging powered by **Socket.io**.
6. **AI Assistant Integration**: Get immediate help, professional advice, or platform guidance via the cinematic **Groq AI Chatbot** anchored on the screen.
7. **Comprehensive Admin Panel**: Seamless verification of alumni credentials and live platform database analytics.
8. **Cinematic Footer System**: Interactive layout with instant newsletter subscription and smooth footer navigations.

---

## ⚙️ Architecture and Stack

- **Frontend**: React (Vite, TypeScript, TailwindCSS/Vanilla HSL CSS variables, Framer Motion, React Icons, Canvas Confetti).
- **Backend**: Node.js, Express.js, Socket.io, Mongoose (MongoDB).
- **AI Core**: Groq AI integration with pre-configured high-speed inference.
- **Database**: MongoDB Atlas for highly scalable document-based storage.

---

## 🚀 Quick Setup & Installation

Please refer to the detailed step-by-step setup guides to launch the project locally or deploy it to production.

### Prerequisites
- **Node.js** (v18.x or higher)
- **MongoDB Atlas** account (free cluster)

### Local Configuration

1. **Configure Backend Environment:**
   Create a `.env` file in the `/backend` folder:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_uri
   JWT_SECRET=maatram_secret_key_2026
   ADMIN_SECRET_CODE=25112006
   GROQ_API_KEY=your_groq_api_key_here
   ```

2. **Install & Run Backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Install & Run Frontend:**
   In a new terminal:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Open `http://localhost:5173` to experience the live platform!

---

## 🌍 Deployed Services
- **Frontend Hosting**: Vercel / Netlify
- **Backend Hosting**: Render / Railway
- **Database Hosting**: MongoDB Atlas

---

*This platform complies strictly with branding rules: zero raw emojis, premium styling, custom modals, and zero overlapping text.*
