const express = require('express');
const cors = require('cors');
const app = express();
const aiService = require('./services/aiService');

// Basic configuration
app.set('view engine', 'ejs');
app.use(express.json());

// Add CORS middleware
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['POST', 'GET'],
  credentials: true
}));

// Mock database
let posts = [];
let botResponses = [];

// AI Service endpoint
app.post('/api/generate-response', async (req, res) => {
  try {
    const { userMessage } = req.body;
    const response = await aiService.generateResponse(userMessage);
    botResponses.push(response);
    res.json(response);
  } catch (error) {
    console.error('AI Service Error:', error);
    res.status(500).json({
      error: 'Failed to generate response',
      details: error.message
    });
  }
}); 

// Server initialization
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
}); 