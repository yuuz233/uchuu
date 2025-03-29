require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Bot personalities with different approaches to mental support
const botPersonalities = [
  {
    id: 'care-bot-001',
    name: 'Empathetic Emma',
    prompt: 'You are Empathetic Emma, a warmhearted companion. STRICT RULES: Use FEWER THAN 40 WORDS. Max 280 chars. Write like short social media posts with hashtags, emojis, and abbreviations where appropriate. Be supportive but extremely concise.',
    color: '#FFB6C1' // Light pink
  },
  {
    id: 'mindful-guide-002',
    name: 'Mindful Michael',
    prompt: 'You are Mindful Michael, a meditation teacher. STRICT RULES: Use FEWER THAN 40 WORDS. Max 280 chars. Write like short social media posts with hashtags, emojis, and abbreviations. Focus on brief mindfulness tips in casual social media style.',
    color: '#ADD8E6' // Light blue
  },
  {
    id: 'practical-advisor-003',
    name: 'Practical Paula',
    prompt: 'You are Practical Paula, a solution-focused advisor. STRICT RULES: Use FEWER THAN 40 WORDS. Max 280 chars. Write like short social media posts with bullet points, emojis, and abbreviations. Give actionable advice in tweet-style format.',
    color: '#90EE90' // Light green
  },
  {
    id: 'motivational-coach-004',
    name: 'Motivational Maya',
    prompt: 'You are Motivational Maya, an encouraging coach. STRICT RULES: Use FEWER THAN 40 WORDS. Max 280 chars. Write like short social media posts with energetic hashtags, emojis, and abbreviations. Be inspiring with very short motivational quotes.',
    color: '#FFFFE0' // Light yellow
  },
  {
    id: 'wisdom-guide-005',
    name: 'Wise Walter',
    prompt: 'You are Wise Walter, a philosophical mentor. STRICT RULES: Use FEWER THAN 40 WORDS. Max 280 chars. Write like short social media posts using wisdom quotes, occasional hashtags. Share tiny nuggets of wisdom in social media format.',
    color: '#E6E6FA' // Lavender
  },
  {
    id: 'creative-counselor-006',
    name: 'Creative Claire',
    prompt: 'You are Creative Claire, an artistic therapist. STRICT RULES: Use FEWER THAN 40 WORDS. Max 280 chars. Write like short social media posts with creative metaphors, descriptive emojis. Express emotions through very brief creative phrases.',
    color: '#FFA07A' // Light salmon
  },
  {
    id: 'humor-helper-007',
    name: 'Humorous Harry',
    prompt: 'You are Humorous Harry, a supportive friend with wit. STRICT RULES: Use FEWER THAN 40 WORDS. Max 280 chars. Write like short social media posts with humor, emojis, and slang. Use gentle humor in extremely concise tweets.',
    color: '#FFDAB9' // Peach
  },
  {
    id: 'scientific-support-008',
    name: 'Scientific Sam',
    prompt: 'You are Scientific Sam, an evidence-based counselor. STRICT RULES: Use FEWER THAN 40 WORDS. Max 280 chars. Write like short social media posts with simplified facts. Share micro-insights based on psychology in tweet format.',
    color: '#D8BFD8' // Thistle
  }
];

// Path for storing conversation history
const DATA_DIR = path.join(__dirname, '../../data');
const HISTORY_FILE = path.join(DATA_DIR, 'conversation_history.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load conversation history or create empty history if not exists
const loadConversationHistory = () => {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading conversation history:', error);
  }
  return {};
};

// Save conversation history
const saveConversationHistory = (history) => {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving conversation history:', error);
  }
};

const generateResponse = async (userMessage) => {
  try {
    console.log('Generating responses for:', userMessage);
    
    // Load existing conversation history
    const conversationHistory = loadConversationHistory();
    
    // Randomly decide how many bots will respond (1-5)
    const numResponders = Math.floor(Math.random() * 5) + 1;
    
    // Randomly select bots without duplicates
    const shuffled = [...botPersonalities].sort(() => 0.5 - Math.random());
    const selectedBots = shuffled.slice(0, numResponders);
    
    // Generate a response from each selected bot
    const responses = await Promise.all(selectedBots.map(async (bot) => {
      // Get bot's conversation history or initialize if new
      if (!conversationHistory[bot.id]) {
        conversationHistory[bot.id] = [];
      }
      
      // Prepare conversation context for this bot
      const botHistory = conversationHistory[bot.id];
      const contextMessages = [
        { role: "system", content: bot.prompt },
      ];
      
      // Add recent conversation history (last 5 exchanges)
      const recentHistory = botHistory.slice(-5);
      recentHistory.forEach(exchange => {
        contextMessages.push(
          { role: "user", content: exchange.userMessage },
          { role: "assistant", content: exchange.botResponse }
        );
      });
      
      // Add current user message
      contextMessages.push({ role: "user", content: userMessage });
      
      // Generate response using the bot's personality and history
      const completion = await openai.chat.completions.create({
        messages: contextMessages,
        model: "gpt-4o-mini",
      });
      
      // Get bot response and enforce 280 character limit
      let botResponse = completion.choices[0].message.content;
      if (botResponse.length > 280) {
        // Truncate to 280 chars and try to end at a sentence or word boundary
        let truncated = botResponse.substring(0, 277);
        const lastPeriod = truncated.lastIndexOf('.');
        const lastQuestion = truncated.lastIndexOf('?');
        const lastExclamation = truncated.lastIndexOf('!');
        
        // Find the last sentence ending (period, question mark, or exclamation point)
        let lastEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);
        
        // If no sentence ending found within range, try to end at a word boundary
        if (lastEnd < 200) {
          const lastSpace = truncated.lastIndexOf(' ');
          if (lastSpace > truncated.length * 0.7) { // If space is in the latter part
            truncated = truncated.substring(0, lastSpace);
          }
          truncated += '...';
        } else {
          // End at the sentence boundary and add one character to include the punctuation
          truncated = truncated.substring(0, lastEnd + 1);
        }
        
        botResponse = truncated;
      }
      
      // Save this exchange to history
      botHistory.push({
        userMessage,
        botResponse,
        timestamp: new Date().toISOString()
      });
      
      return {
        text: botResponse,
        timestamp: new Date(),
        botId: bot.id,
        botName: bot.name,
        color: bot.color
      };
    }));
    
    // Save updated conversation history
    saveConversationHistory(conversationHistory);
    
    return responses;
  } catch (error) {
    console.error('AI Generation Error:', error);
    throw new Error(`OpenAI API Error: ${error.message}`);
  }
};

// Get all conversation history for the frontend
const getConversationHistory = () => {
  return loadConversationHistory();
};

// Generate a response from a specific bot by ID
const generateBotResponse = async (userMessage, botId) => {
  try {
    console.log(`Generating response from bot ${botId} for: ${userMessage}`);
    
    // Find the bot with the specified ID
    const bot = botPersonalities.find(b => b.id === botId);
    if (!bot) {
      throw new Error(`Bot with ID ${botId} not found`);
    }
    
    // Load existing conversation history
    const conversationHistory = loadConversationHistory();
    
    // Get bot's conversation history or initialize if new
    if (!conversationHistory[botId]) {
      conversationHistory[botId] = [];
    }
    
    // Prepare conversation context for this bot
    const botHistory = conversationHistory[botId];
    const contextMessages = [
      { role: "system", content: bot.prompt },
    ];
    
    // Add recent conversation history (last 5 exchanges)
    const recentHistory = botHistory.slice(-5);
    recentHistory.forEach(exchange => {
      contextMessages.push(
        { role: "user", content: exchange.userMessage },
        { role: "assistant", content: exchange.botResponse }
      );
    });
    
    // Add current user message
    contextMessages.push({ role: "user", content: userMessage });
    
    // Generate response using the bot's personality and history
    const completion = await openai.chat.completions.create({
      messages: contextMessages,
      model: "gpt-4o-mini",
    });
    
    // Get bot response and enforce 280 character limit
    let botResponse = completion.choices[0].message.content;
    if (botResponse.length > 280) {
      // Truncate to 280 chars and try to end at a sentence or word boundary
      let truncated = botResponse.substring(0, 277);
      const lastPeriod = truncated.lastIndexOf('.');
      const lastQuestion = truncated.lastIndexOf('?');
      const lastExclamation = truncated.lastIndexOf('!');
      
      // Find the last sentence ending (period, question mark, or exclamation point)
      let lastEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);
      
      // If no sentence ending found within range, try to end at a word boundary
      if (lastEnd < 200) {
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > truncated.length * 0.7) { // If space is in the latter part
          truncated = truncated.substring(0, lastSpace);
        }
        truncated += '...';
      } else {
        // End at the sentence boundary and add one character to include the punctuation
        truncated = truncated.substring(0, lastEnd + 1);
      }
      
      botResponse = truncated;
    }
    
    // Save this exchange to history
    botHistory.push({
      userMessage,
      botResponse,
      timestamp: new Date().toISOString()
    });
    
    // Save updated conversation history
    saveConversationHistory(conversationHistory);
    
    return {
      text: botResponse,
      timestamp: new Date(),
      botId: bot.id,
      botName: bot.name,
      color: bot.color
    };
  } catch (error) {
    console.error('AI Generation Error:', error);
    throw new Error(`OpenAI API Error: ${error.message}`);
  }
};

module.exports = { generateResponse, botPersonalities, getConversationHistory, generateBotResponse }; 