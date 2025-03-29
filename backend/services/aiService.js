require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const generateResponse = async (userMessage) => {
  try {
    console.log('Generating response for:', userMessage);
    
    const prompt = `You're a mental support companion. Respond to this message with empathy and care: "${userMessage}"`;
    
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o-mini",
    });

    console.log('API Response:', completion);
    
    return {
      text: completion.choices[0].message.content,
      timestamp: new Date(),
      botId: 'care-bot-001'
    };
  } catch (error) {
    console.error('AI Generation Error:', error);
    throw new Error(`OpenAI API Error: ${error.message}`);
  }
};

module.exports = { generateResponse }; 