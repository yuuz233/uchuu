#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}     UCHUU Production Deployment     ${NC}"
echo -e "${BLUE}====================================${NC}"

# Check for dependencies
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm first.${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if PM2 is installed (for production process management)
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 is not installed. Installing PM2 globally...${NC}"
    npm install -g pm2
fi

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}Missing backend/.env file. Please create it with your OPENAI_API_KEY.${NC}"
    exit 1
fi

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
npm run install:all

# Build the frontend
echo -e "${GREEN}Building frontend...${NC}"
cd frontend && npm run build && cd ..

# Create data directory if it doesn't exist
if [ ! -d "data" ]; then
    echo -e "${YELLOW}Creating data directory for conversation history...${NC}"
    mkdir -p data
fi

# Stop any existing processes
echo -e "${YELLOW}Stopping any existing processes...${NC}"
pm2 stop uchuu-frontend uchuu-backend 2>/dev/null || true
pm2 delete uchuu-frontend uchuu-backend 2>/dev/null || true

# Start backend with PM2
echo -e "${GREEN}Starting backend server with PM2...${NC}"
pm2 start backend/server.js --name uchuu-backend

# Start frontend with PM2
echo -e "${GREEN}Starting frontend server with PM2...${NC}"
cd frontend && pm2 start npm --name uchuu-frontend -- start && cd ..

# Display information
echo -e "${BLUE}====================================${NC}"
echo -e "${GREEN}UCHUU is now running in production mode${NC}"
echo -e "${YELLOW}Frontend: ${NC}http://localhost:3000"
echo -e "${YELLOW}Backend API: ${NC}http://localhost:3001"
echo -e ""
echo -e "${BLUE}Manage your application with:${NC}"
echo -e "${YELLOW}pm2 status${NC} - Check application status"
echo -e "${YELLOW}pm2 logs${NC} - View logs"
echo -e "${YELLOW}pm2 stop uchuu-frontend uchuu-backend${NC} - Stop the application"
echo -e "${BLUE}====================================${NC}"

# Save PM2 configuration to restart on system reboot
pm2 save

echo -e "${GREEN}Deployment complete!${NC}" 