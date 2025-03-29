import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [botPersonalities, setBotPersonalities] = useState([]);
  const [expandedThreadId, setExpandedThreadId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null); // Now stores {threadId, postType, index}
  const [replyText, setReplyText] = useState('');
  const replyInputRef = useRef(null);

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
                replies: [], // Add support for user replies
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

  // Handle Ctrl+Enter to submit
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Handle reply Ctrl+Enter to submit
  const handleReplyKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleReplySubmit(e);
    }
  };

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
        replies: [], // Initialize replies array
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
    // Reset replying state when toggling threads
    setReplyingTo(null);
    setReplyText('');
  };

  const startReply = (threadId, postType = 'thread', index = null) => {
    setReplyingTo({ threadId, postType, index });
    setExpandedThreadId(threadId); // Make sure thread is expanded when replying
    
    // Focus the reply input when it becomes visible
    setTimeout(() => {
      if (replyInputRef.current) {
        replyInputRef.current.focus();
      }
    }, 100);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };

  const getReplyTargetName = () => {
    if (!replyingTo) return '';
    
    const thread = posts.find(p => p.id === replyingTo.threadId);
    if (!thread) return '';
    
    if (replyingTo.postType === 'thread') {
      return 'the thread';
    } else if (replyingTo.postType === 'bot') {
      const botResponse = thread.responses[replyingTo.index];
      return botResponse ? botResponse.botName : 'a bot';
    } else if (replyingTo.postType === 'reply') {
      const reply = thread.replies[replyingTo.index];
      return reply ? reply.username : 'a user';
    }
    
    return '';
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !replyingTo) return;
    
    // Store the current reply text and target
    const currentReplyText = replyText;
    const currentReplyingTo = { ...replyingTo };
    
    // Add reply to the thread immediately
    setPosts(prevPosts => {
      const updatedPosts = [...prevPosts];
      const threadIndex = updatedPosts.findIndex(t => t.id === currentReplyingTo.threadId);
      
      if (threadIndex >= 0) {
        // Add user's reply
        const userReply = {
          text: currentReplyText,
          timestamp: new Date(),
          isUser: true,
          username: 'You',
          replyTo: {
            type: currentReplyingTo.postType,
            index: currentReplyingTo.index
          }
        };
        
        updatedPosts[threadIndex].replies.push(userReply);
      }
      
      return updatedPosts;
    });
    
    // Reset reply state immediately so user can continue
    setReplyText('');
    setReplyingTo(null);
    
    // Get bot response in the background if replying to a bot
    if (currentReplyingTo.postType === 'bot') {
      // We need to find the thread and bot response outside of the state update function
      // since we want to reference the current value of posts, not the previous one
      const thread = posts.find(t => t.id === currentReplyingTo.threadId);
      
      if (thread) {
        const botResponse = thread.responses[currentReplyingTo.index];
        
        // If we have a valid bot to reply to
        if (botResponse && botResponse.botId) {
          // Async operation - don't wait for it
          (async () => {
            try {
              // Call API to get response from this specific bot
              const response = await fetch('/api/generate-bot-response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  userMessage: currentReplyText,
                  botId: botResponse.botId
                })
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const botReply = await response.json();
              
              // Add bot's reply to the thread
              setPosts(currentPosts => {
                const updatedPosts = [...currentPosts];
                const threadIndex = updatedPosts.findIndex(t => t.id === currentReplyingTo.threadId);
                
                if (threadIndex >= 0) {
                  // Find the index of the user's reply we just added
                  const userReplyIndex = updatedPosts[threadIndex].replies.findIndex(
                    r => r.isUser && 
                    r.replyTo.type === currentReplyingTo.postType && 
                    r.replyTo.index === currentReplyingTo.index
                  );
                  
                  if (userReplyIndex !== -1) {
                    // Add bot reply
                    updatedPosts[threadIndex].replies.push({
                      text: botReply.text,
                      timestamp: new Date(botReply.timestamp),
                      isBot: true,
                      botId: botReply.botId,
                      botName: botReply.botName,
                      color: botReply.color,
                      replyTo: {
                        type: 'reply',
                        index: userReplyIndex
                      }
                    });
                  }
                }
                
                return updatedPosts;
              });
            } catch (error) {
              console.error('Reply Error:', error);
              // Don't show alert as it disrupts the flow, just log to console
              console.log('Failed to get bot response: ' + error.message);
            }
          })();
        }
      }
    }
  };

  const retweet = (threadId, text, name) => {
    // Prepare the retweet text
    setNewPost(`RT @${name}: "${text}"`);
    
    // Focus on the main textarea
    document.querySelector('textarea[placeholder="What\'s on your mind?"]').focus();
  };

  return (
    <div className="container">
      <h1>Uchuu</h1>
      
      {isLoading ? (
        <div className="loading">Loading conversation history...</div>
      ) : (
        <>
          <form onSubmit={handleSubmit}>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What's on your mind?"
            />
            <div className="form-actions">
              <span className="keyboard-tip">Pro tip: Press Ctrl+Enter to post</span>
              <button type="submit">Tweet</button>
            </div>
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
                      <span className="reply-count">
                        {thread.responses.length + (thread.replies?.length || 0)} replies
                      </span>
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
                    {/* Thread actions */}
                    <div className="thread-actions">
                      <button 
                        className="action-button reply-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startReply(thread.id, 'thread');
                        }}
                      >
                        Reply to Thread
                      </button>
                      <button 
                        className="action-button retweet-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          retweet(thread.id, thread.userMessage.text, 'You');
                        }}
                      >
                        Retweet
                      </button>
                    </div>
                    
                    {thread.responses.map((response, responseIndex) => (
                      <div 
                        key={`bot-${responseIndex}`} 
                        className="post bot"
                        style={{ backgroundColor: response.color || '#f0f0f0' }}
                      >
                        <div className="bot-name">{response.botName || 'Bot'}</div>
                        <p>{response.text}</p>
                        <div className="post-meta">
                          <small>{new Date(response.timestamp).toLocaleTimeString()}</small>
                          <div className="post-actions">
                            <button 
                              className="action-button-small"
                              onClick={(e) => {
                                e.stopPropagation();
                                startReply(thread.id, 'bot', responseIndex);
                              }}
                            >
                              Reply
                            </button>
                            <button 
                              className="action-button-small"
                              onClick={(e) => {
                                e.stopPropagation();
                                retweet(thread.id, response.text, response.botName);
                              }}
                            >
                              Retweet
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Show user replies and bot responses to those replies */}
                    {thread.replies && 
                      // First, group replies by conversation threads
                      Array.from(new Array(thread.replies.length)).map((_, index) => {
                        const reply = thread.replies[index];
                        
                        // Skip if this reply is part of a conversation and not the start of it
                        if (reply && reply.replyTo && reply.replyTo.type === 'reply') return null;
                        
                        // Find all replies that are part of this conversation thread
                        const conversationReplies = [reply];
                        let nextReplyIndex = index + 1;
                        
                        // Look for bot responses to this reply or subsequent replies in this thread
                        while (
                          nextReplyIndex < thread.replies.length && 
                          thread.replies[nextReplyIndex] && 
                          thread.replies[nextReplyIndex].replyTo && 
                          thread.replies[nextReplyIndex].replyTo.type === 'reply' &&
                          thread.replies[nextReplyIndex].replyTo.index === index
                        ) {
                          conversationReplies.push(thread.replies[nextReplyIndex]);
                          nextReplyIndex++;
                        }
                        
                        // If this is a valid conversation thread, render it
                        if (reply) {
                          return (
                            <div key={`conversation-${index}`} className="conversation-group">
                              {/* Original reply */}
                              <div 
                                key={`reply-${index}`} 
                                className={`post reply ${reply.isBot ? 'bot-reply' : 'user-reply'}`}
                                style={reply.isBot ? { backgroundColor: reply.color || '#f0f0f0' } : {}}
                              >
                                <div className={reply.isBot ? 'bot-name' : 'user-name'}>
                                  {reply.isBot ? (reply.botName || 'Bot') : (reply.username || 'User')}
                                </div>
                                <p>{reply.text}</p>
                                <div className="reply-context">
                                  {reply.replyTo && (
                                    <span className="reply-to-info">
                                      Replying to: {
                                        reply.replyTo.type === 'thread' ? 'Thread' : 
                                        reply.replyTo.type === 'bot' && thread.responses[reply.replyTo.index] ? 
                                        thread.responses[reply.replyTo.index].botName : 
                                        (reply.replyTo.type === 'reply' && thread.replies[reply.replyTo.index] ? 
                                        (thread.replies[reply.replyTo.index].isBot ? 
                                          thread.replies[reply.replyTo.index].botName : 
                                          thread.replies[reply.replyTo.index].username) : 
                                        'someone')
                                      }
                                    </span>
                                  )}
                                </div>
                                <div className="post-meta">
                                  <small>{new Date(reply.timestamp).toLocaleTimeString()}</small>
                                  <div className="post-actions">
                                    <button 
                                      className="action-button-small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startReply(thread.id, 'reply', index);
                                      }}
                                    >
                                      Reply
                                    </button>
                                    <button 
                                      className="action-button-small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        retweet(thread.id, reply.text, reply.isBot ? reply.botName : reply.username);
                                      }}
                                    >
                                      Retweet
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Responses in this conversation */}
                              {conversationReplies.length > 1 && (
                                <div className="conversation-thread">
                                  {conversationReplies.slice(1).map((nestedReply, nestedIndex) => (
                                    <div 
                                      key={`nested-reply-${index}-${nestedIndex}`} 
                                      className={`post reply ${nestedReply.isBot ? 'bot-reply' : 'user-reply'}`}
                                      style={nestedReply.isBot ? { backgroundColor: nestedReply.color || '#f0f0f0' } : {}}
                                    >
                                      <div className={nestedReply.isBot ? 'bot-name' : 'user-name'}>
                                        {nestedReply.isBot ? (nestedReply.botName || 'Bot') : (nestedReply.username || 'User')}
                                      </div>
                                      <p>{nestedReply.text}</p>
                                      <div className="post-meta">
                                        <small>{new Date(nestedReply.timestamp).toLocaleTimeString()}</small>
                                        <div className="post-actions">
                                          <button 
                                            className="action-button-small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              startReply(thread.id, 'reply', index + 1 + nestedIndex);
                                            }}
                                          >
                                            Reply
                                          </button>
                                          <button 
                                            className="action-button-small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              retweet(
                                                thread.id, 
                                                nestedReply.text, 
                                                nestedReply.isBot ? nestedReply.botName : nestedReply.username
                                              );
                                            }}
                                          >
                                            Retweet
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        }
                        
                        return null;
                      }).filter(Boolean)  // Remove null items
                    }
                    
                    {/* Reply form */}
                    {replyingTo && replyingTo.threadId === thread.id && (
                      <form onSubmit={handleReplySubmit} className="reply-form">
                        <div className="replying-to">
                          Replying to {getReplyTargetName()}
                        </div>
                        <textarea
                          ref={replyInputRef}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={handleReplyKeyDown}
                          placeholder="Tweet your reply..."
                        />
                        <div className="form-actions">
                          <button type="button" onClick={cancelReply} className="cancel-button">
                            Cancel
                          </button>
                          <button type="submit" className="reply-submit-button">
                            Reply
                          </button>
                        </div>
                      </form>
                    )}
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
        
        .form-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .keyboard-tip {
          color: #657786;
          font-size: 13px;
          font-style: italic;
        }
        
        button {
          padding: 10px 15px;
          background-color: #1da1f2;
          color: white;
          border: none;
          border-radius: 30px;
          cursor: pointer;
          font-weight: bold;
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
        
        .post.reply {
          background-color: #f5f8fa;
          border-left: 3px solid #1da1f2;
        }
        
        .post.reply.user-reply {
          background-color: #f5f8fa;
          border-left: 3px solid #1da1f2;
        }
        
        .post.reply.bot-reply {
          border-left: 3px solid currentColor;
          padding-left: 12px;
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
        
        .post-actions {
          display: flex;
          gap: 10px;
        }
        
        .action-button-small {
          background-color: transparent;
          border: none;
          color: #1da1f2;
          font-size: 12px;
          padding: 2px 8px;
          cursor: pointer;
          border-radius: 15px;
          font-weight: normal;
        }
        
        .action-button-small:hover {
          background-color: rgba(29, 161, 242, 0.1);
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
        
        .user-name {
          font-weight: bold;
          margin-bottom: 5px;
          color: #1da1f2;
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
        
        .reply-context {
          font-size: 12px;
          color: #657786;
          margin-bottom: 5px;
          font-style: italic;
        }
        
        .replying-to {
          font-size: 14px;
          color: #657786;
          margin-bottom: 10px;
          font-style: italic;
        }
        
        small {
          display: block;
          font-size: 0.8em;
          color: #657786;
        }
        
        .thread-actions {
          display: flex;
          padding: 10px 15px;
          gap: 10px;
          border-bottom: 1px solid #e1e8ed;
        }
        
        .action-button {
          background-color: transparent;
          color: #1da1f2;
          padding: 5px 10px;
          font-size: 14px;
          border: 1px solid #1da1f2;
          border-radius: 20px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .action-button:hover {
          background-color: rgba(29, 161, 242, 0.1);
        }
        
        .reply-form {
          padding: 15px;
          background-color: #f5f8fa;
          border-top: 1px solid #e1e8ed;
        }
        
        .reply-form textarea {
          min-height: 60px;
        }
        
        .cancel-button {
          background-color: transparent;
          color: #657786;
          border: 1px solid #657786;
        }
        
        .cancel-button:hover {
          background-color: rgba(101, 119, 134, 0.1);
        }
        
        .reply-submit-button {
          background-color: #1da1f2;
        }
        
        .conversation-thread {
          margin-left: 15px;
          border-left: 1px dashed #e1e8ed;
          padding-left: 10px;
        }
      `}</style>
    </div>
  );
}