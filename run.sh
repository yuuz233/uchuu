#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}       UCHUU Deployment Script      ${NC}"
echo -e "${BLUE}====================================${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm first.${NC}"
    exit 1
fi

# Check if .env file exists, if not create a template
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}Creating .env file template in backend directory...${NC}"
    echo "OPENAI_API_KEY=your_openai_api_key_here" > backend/.env
    echo -e "${YELLOW}Please edit backend/.env and add your OpenAI API key before running again.${NC}"
    exit 1
fi

# Check if OpenAI API key is set
OPENAI_KEY=$(grep OPENAI_API_KEY backend/.env | cut -d '=' -f2)
if [ "$OPENAI_KEY" = "your_openai_api_key_here" ]; then
    echo -e "${RED}Please add your OpenAI API key to backend/.env before running.${NC}"
    exit 1
fi

# Install all dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
npm run install:all

# Create data directory if it doesn't exist
if [ ! -d "data" ]; then
    echo -e "${YELLOW}Creating data directory for conversation history...${NC}"
    mkdir -p data
fi

# Run the application in development mode
echo -e "${GREEN}Starting Uchuu application...${NC}"
echo -e "${YELLOW}Frontend will be available at: ${NC}http://localhost:3000"
echo -e "${YELLOW}Backend API will be available at: ${NC}http://localhost:3001"
echo -e "${BLUE}====================================${NC}"
echo -e "${GREEN}Press Ctrl+C to stop the application${NC}"

npm run dev 