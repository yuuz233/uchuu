import { useState, useEffect } from 'react';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');

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
      
      const botResponse = await response.json();
      setPosts([...posts, 
        { text: newPost, type: 'user' },
        { ...botResponse, type: 'bot' }
      ]);
      setNewPost('');
    } catch (error) {
      console.error('Submission Error:', error);
      alert('Failed to get bot response: ' + error.message);
    }
  };

  return (
    <div className="container">
      <h1>Mental Support Feed</h1>
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
          <div key={index} className={`post ${post.type}`}>
            <p>{post.text}</p>
            {post.type === 'bot' && 
              <small>{new Date(post.timestamp).toLocaleTimeString()}</small>}
          </div>
        ))}
      </div>
    </div>
  );
}