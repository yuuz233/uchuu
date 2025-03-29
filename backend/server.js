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
    const responses = await aiService.generateResponse(userMessage);
    
    // Now responses is an array, store each response
    responses.forEach(response => {
      botResponses.push(response);
    });
    
    res.json(responses);
  } catch (error) {
    console.error('AI Service Error:', error);
    res.status(500).json({
      error: 'Failed to generate response',
      details: error.message
    });
  }
});

// Endpoint to generate a response from a specific bot
app.post('/api/generate-bot-response', async (req, res) => {
  try {
    const { userMessage, botId } = req.body;
    
    if (!botId) {
      return res.status(400).json({
        error: 'Missing botId parameter'
      });
    }
    
    const response = await aiService.generateBotResponse(userMessage, botId);
    botResponses.push(response);
    
    res.json(response);
  } catch (error) {
    console.error('AI Service Error:', error);
    res.status(500).json({
      error: 'Failed to generate bot response',
      details: error.message
    });
  }
});

// Endpoint to get chat history
app.get('/api/conversation-history', (req, res) => {
  try {
    const history = aiService.getConversationHistory();
    res.json(history);
  } catch (error) {
    console.error('History Retrieval Error:', error);
    res.status(500).json({
      error: 'Failed to retrieve conversation history',
      details: error.message
    });
  }
});

// Endpoint to get bot personalities
app.get('/api/bot-personalities', (req, res) => {
  try {
    res.json(aiService.botPersonalities);
  } catch (error) {
    console.error('Bot Personalities Error:', error);
    res.status(500).json({
      error: 'Failed to retrieve bot personalities',
      details: error.message
    });
  }
});

// Server initialization
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
}); 