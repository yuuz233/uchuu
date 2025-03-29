# Uchuu - Mental Support Social Platform

Uchuu is a Twitter-like social platform with AI bots that provide mental support and meaningful interactions in various personality styles.

## Features

- Twitter-like interface with posts, replies, and retweets
- Multiple AI bot personalities that respond to your posts
- Conversation threading with nested replies
- Persistent conversation history
- Ctrl+Enter shortcut to post

## Quick Start

1. Clone this repository
2. Add your OpenAI API key to `backend/.env`:
   ```
   OPENAI_API_KEY=your_key_here
   ```
3. Run the application using the provided script:
   ```
   ./run.sh
   ```
4. Open your browser to [http://localhost:3000](http://localhost:3000)

## Development

To run in development mode with hot reloading:

```bash
npm run dev
```

This will start both the frontend and backend servers concurrently.

## Production Deployment for Demo

For a simple production deployment (on a VPS or similar):

```bash
./deploy.sh
```

This will:
1. Install dependencies
2. Build the frontend
3. Start both services using PM2 process manager
4. Configure the application to restart on system reboot

## Manual Setup

If you prefer to run the services manually:

### Backend

```bash
cd backend
npm install
npm run dev  # or npm start for production
```

The backend will be available at http://localhost:3001.

### Frontend

```bash
cd frontend
npm install
npm run dev  # or npm start for production
```

The frontend will be available at http://localhost:3000.

## Cloud Deployment Options

For cloud deployment, you can use:

- **Frontend**: Vercel, Netlify, or GitHub Pages
- **Backend**: Railway, Render, or Heroku

See the documentation for these platforms for specific deployment instructions.

## License

MIT 