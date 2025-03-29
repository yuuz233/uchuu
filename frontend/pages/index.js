import { useState, useEffect } from 'react';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [botPersonalities, setBotPersonalities] = useState([]);

  // Load conversation history when page loads
  useEffect(() => {
    const loadHistoryAndPersonalities = async () => {
      try {
        setIsLoading(true);
        
        // First, get bot personalities
        const personalitiesResponse = await fetch('/api/bot-personalities');
        if (!personalitiesResponse.ok) {
          throw new Error(`HTTP error! status: ${personalitiesResponse.status}`);
        }
        const personalities = await personalitiesResponse.json();
        setBotPersonalities(personalities);
        
        // Then, get conversation history
        const historyResponse = await fetch('/api/conversation-history');
        if (!historyResponse.ok) {
          throw new Error(`HTTP error! status: ${historyResponse.status}`);
        }
        
        const history = await historyResponse.json();
        
        // Process history to display in feed
        const allPosts = [];
        
        // For each bot in the history
        Object.keys(history).forEach(botId => {
          const botHistory = history[botId];
          
          // For each conversation entry of this bot
          botHistory.forEach(entry => {
            // Find if this user message is already in our posts
            const userMessageIndex = allPosts.findIndex(
              post => post.type === 'user' && post.text === entry.userMessage && 
              new Date(post.timestamp).toISOString().split('T')[0] === new Date(entry.timestamp).toISOString().split('T')[0]
            );
            
            // If this user message doesn't exist yet, add it
            if (userMessageIndex === -1) {
              allPosts.push({
                text: entry.userMessage,
                type: 'user',
                timestamp: new Date(entry.timestamp)
              });
            }
            
            // Add the bot response
            const botInfo = personalities.find(bot => bot.id === botId) || {};
            allPosts.push({
              text: entry.botResponse,
              type: 'bot',
              timestamp: new Date(entry.timestamp),
              botId: botId,
              botName: botInfo.name || 'Bot',
              color: botInfo.color || '#f0f0f0'
            });
          });
        });
        
        // Sort all posts by timestamp
        allPosts.sort((a, b) => a.timestamp - b.timestamp);
        
        setPosts(allPosts);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading history:', error);
        setIsLoading(false);
      }
    };
    
    loadHistoryAndPersonalities();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: newPost })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const botResponses = await response.json();
      
      // First add the user's message
      const updatedPosts = [...posts, { 
        text: newPost, 
        type: 'user',
        timestamp: new Date()
      }];
      
      // Then add each bot response
      botResponses.forEach(botResponse => {
        updatedPosts.push({
          ...botResponse,
          type: 'bot'
        });
      });
      
      setPosts(updatedPosts);
      setNewPost('');
    } catch (error) {
      console.error('Submission Error:', error);
      alert('Failed to get bot response: ' + error.message);
    }
  };

  return (
    <div className="container">
      <h1>Mental Support Feed</h1>
      
      {isLoading ? (
        <div className="loading">Loading conversation history...</div>
      ) : (
        <>
          <form onSubmit={handleSubmit}>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="How are you feeling today?"
            />
            <button type="submit">Post</button>
          </form>
          <div className="feed">
            {posts.map((post, index) => (
              <div 
                key={index} 
                className={`post ${post.type}`}
                style={post.type === 'bot' ? { backgroundColor: post.color || '#f0f0f0' } : {}}
              >
                {post.type === 'bot' && <div className="bot-name">{post.botName || 'Bot'}</div>}
                <p>{post.text}</p>
                {post.type === 'bot' && 
                  <small>{new Date(post.timestamp).toLocaleTimeString()}</small>}
              </div>
            ))}
          </div>
        </>
      )}
      
      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        
        h1 {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .loading {
          text-align: center;
          margin: 20px 0;
          font-style: italic;
          color: #777;
        }
        
        form {
          display: flex;
          flex-direction: column;
          margin-bottom: 20px;
        }
        
        textarea {
          padding: 10px;
          margin-bottom: 10px;
          min-height: 80px;
          border-radius: 5px;
          border: 1px solid #ddd;
        }
        
        button {
          padding: 10px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        
        .feed {
          display: flex;
          flex-direction: column;
        }
        
        .post {
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 10px;
        }
        
        .post.user {
          align-self: flex-end;
          background-color: #DCF8C6;
          max-width: 70%;
        }
        
        .post.bot {
          align-self: flex-start;
          max-width: 70%;
          position: relative;
        }
        
        .bot-name {
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        small {
          display: block;
          text-align: right;
          font-size: 0.8em;
          margin-top: 5px;
          color: #777;
        }
      `}</style>
    </div>
  );
}