const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Keep ONLY this customized CORS configuration
app.use(cors({
    origin: ['https://crm.guinwebsolutions.com', 'http://localhost:5173'],
    credentials: true
}));

// Middleware
app.use(express.json());
// ❌ REMOVE THIS: app.use(cors()); (Do not call it twice)

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/leads', require('./routes/leadRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// Base route check
app.get('/', (req, res) => {
    res.send('CRM API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));