import { useState, useEffect } from 'react';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [botPersonalities, setBotPersonalities] = useState([]);
  const [expandedThreadId, setExpandedThreadId] = useState(null);

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
        
        // Process history to organize in threads
        const threads = [];
        const threadMap = {};
        
        // For each bot in the history
        Object.keys(history).forEach(botId => {
          const botHistory = history[botId];
          
          // For each conversation entry of this bot
          botHistory.forEach(entry => {
            const userMessage = entry.userMessage;
            const timestamp = new Date(entry.timestamp);
            const dateStr = timestamp.toISOString().split('T')[0]; 
            
            // Create a unique thread ID based on user message and date
            const threadId = `${userMessage.substring(0, 20)}_${dateStr}`;
            
            // If this thread doesn't exist yet, create it
            if (!threadMap[threadId]) {
              const thread = {
                id: threadId,
                userMessage: {
                  text: userMessage,
                  timestamp: timestamp
                },
                responses: [],
                timestamp: timestamp  // Thread timestamp is the user message timestamp
              };
              threads.push(thread);
              threadMap[threadId] = thread;
            }
            
            // Add bot response to thread
            const botInfo = personalities.find(bot => bot.id === botId) || {};
            threadMap[threadId].responses.push({
              text: entry.botResponse,
              timestamp: timestamp,
              botId: botId,
              botName: botInfo.name || 'Bot',
              color: botInfo.color || '#f0f0f0'
            });
          });
        });
        
        // Sort threads by timestamp (newest first)
        threads.sort((a, b) => b.timestamp - a.timestamp);
        
        // Sort responses within each thread
        threads.forEach(thread => {
          thread.responses.sort((a, b) => a.timestamp - b.timestamp);
        });
        
        setPosts(threads);
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
    if (!newPost.trim()) return;
    
    try {
      // Add the user's message first
      const userTimestamp = new Date();
      const threadId = `${newPost.substring(0, 20)}_${userTimestamp.toISOString().split('T')[0]}`;
      
      const newThread = {
        id: threadId,
        userMessage: {
          text: newPost,
          timestamp: userTimestamp
        },
        responses: [],
        timestamp: userTimestamp
      };
      
      // Insert at the beginning (newest first)
      setPosts([newThread, ...posts]);
      
      // Get bot responses
      const response = await fetch('/api/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: newPost })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const botResponses = await response.json();
      
      // Update thread with bot responses
      setPosts(prevPosts => {
        const updatedPosts = [...prevPosts];
        const threadIndex = updatedPosts.findIndex(t => t.id === threadId);
        
        if (threadIndex >= 0) {
          botResponses.forEach(botResponse => {
            updatedPosts[threadIndex].responses.push({
              ...botResponse,
              timestamp: new Date(botResponse.timestamp)
            });
          });
          
          // Auto-expand the new thread
          setExpandedThreadId(threadId);
        }
        
        return updatedPosts;
      });
      
      setNewPost('');
    } catch (error) {
      console.error('Submission Error:', error);
      alert('Failed to get bot response: ' + error.message);
    }
  };

  const toggleThread = (threadId) => {
    setExpandedThreadId(expandedThreadId === threadId ? null : threadId);
  };

  return (
    <div className="container">
      <h1>MindSpace</h1>
      
      {isLoading ? (
        <div className="loading">Loading conversation history...</div>
      ) : (
        <>
          <form onSubmit={handleSubmit}>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="What's on your mind?"
            />
            <button type="submit">Tweet</button>
          </form>
          
          <div className="feed">
            {posts.map((thread) => (
              <div key={thread.id} className="thread">
                <div 
                  className="post user" 
                  onClick={() => toggleThread(thread.id)}
                >
                  <p>{thread.userMessage.text}</p>
                  <div className="post-meta">
                    <small>{new Date(thread.userMessage.timestamp).toLocaleString()}</small>
                    <div className="interactions">
                      <span className="reply-count">{thread.responses.length} replies</span>
                      {expandedThreadId !== thread.id ? (
                        <span className="expand-icon">▼</span>
                      ) : (
                        <span className="expand-icon">▲</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {expandedThreadId === thread.id && (
                  <div className="responses">
                    {thread.responses.map((response, responseIndex) => (
                      <div 
                        key={responseIndex} 
                        className="post bot"
                        style={{ backgroundColor: response.color || '#f0f0f0' }}
                      >
                        <div className="bot-name">{response.botName || 'Bot'}</div>
                        <p>{response.text}</p>
                        <small>{new Date(response.timestamp).toLocaleTimeString()}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      
      <style jsx>{`
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", sans-serif;
          background-color: #f7f9f9;
          min-height: 100vh;
        }
        
        h1 {
          text-align: center;
          margin-bottom: 20px;
          color: #1da1f2;
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
          background-color: white;
          padding: 15px;
          border-radius: 15px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        textarea {
          padding: 10px;
          margin-bottom: 10px;
          min-height: 80px;
          border-radius: 15px;
          border: 1px solid #e1e8ed;
          font-size: 16px;
          resize: none;
          font-family: inherit;
        }
        
        textarea:focus {
          outline: none;
          border-color: #1da1f2;
        }
        
        button {
          padding: 10px 15px;
          background-color: #1da1f2;
          color: white;
          border: none;
          border-radius: 30px;
          cursor: pointer;
          font-weight: bold;
          align-self: flex-end;
          transition: background-color 0.2s;
        }
        
        button:hover {
          background-color: #0c8bd0;
        }
        
        .feed {
          display: flex;
          flex-direction: column;
        }
        
        .thread {
          margin-bottom: 20px;
          border-radius: 15px;
          overflow: hidden;
          background-color: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .post {
          padding: 15px;
          border-bottom: 1px solid #e1e8ed;
        }
        
        .post:last-child {
          border-bottom: none;
        }
        
        .post.user {
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .post.user:hover {
          background-color: #f5f8fa;
        }
        
        .post p {
          margin: 0 0 10px 0;
          font-size: 15px;
          line-height: 1.4;
        }
        
        .post-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #657786;
          font-size: 13px;
        }
        
        .interactions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .reply-count {
          color: #1da1f2;
          font-weight: 500;
        }
        
        .expand-icon {
          font-size: 10px;
          color: #1da1f2;
        }
        
        .bot-name {
          font-weight: bold;
          margin-bottom: 5px;
          color: #14171a;
          display: flex;
          align-items: center;
        }
        
        .bot-name::before {
          content: "";
          display: inline-block;
          width: 15px;
          height: 15px;
          background-color: currentColor;
          border-radius: 50%;
          margin-right: 5px;
          opacity: 0.5;
        }
        
        .responses {
          background-color: #f5f8fa;
          border-top: 1px solid #e1e8ed;
        }
        
        .post.bot {
          margin: 0;
          border-radius: 0;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          padding: 12px 15px;
        }
        
        small {
          display: block;
          font-size: 0.8em;
          color: #657786;
        }
      `}</style>
    </div>
  );
}