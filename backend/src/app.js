const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const moodRoutes = require('./routes/moodRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/appointment', appointmentRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Mental Health API is running!' });
});

module.exports = app;