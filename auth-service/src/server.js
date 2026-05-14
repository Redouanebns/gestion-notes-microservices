const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ service: 'auth-service', status: 'OK' });
});

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});