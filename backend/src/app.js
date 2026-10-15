const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const moodRoutes = require('./routes/moodRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const patientRoutes = require('./routes/patientRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const reportRoutes = require('./routes/reportRoutes');
const aiChatRoutes = require('./routes/aiChatRoutes');

const app = express();

const allowedOrigins = new Set([
  'http://202.28.34.205:8080',
  // Allow local development and optional local .env overrides.
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

const corsOptions = {
  origin(origin, callback) {
    // Requests without Origin (e.g. health checks or curl) are not browser CORS requests.
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/appointment', appointmentRoutes);
app.use('/api/complaint', complaintRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/psychologist', require('./routes/trendRoutes'));
app.use('/api/psychologist', require('./routes/preSessionRoutes'));
app.use('/api/psychologist', require('./routes/chatSummaryRoutes'));
app.use('/api/psychologist', require('./routes/scheduleTemplateRoutes'));

app.get('/', (req, res) => {
  res.json({ message: 'Mental Health API is running!' });
});

module.exports = app;
