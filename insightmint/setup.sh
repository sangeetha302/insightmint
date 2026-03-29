#!/bin/bash
echo "🌱 Setting up InsightMint..."

# Install root dependencies (concurrently)
echo "📦 Installing root dependencies..."
npm install

# Install server
echo "📦 Installing server dependencies..."
cd server && npm install && cd ..

# Install client
echo "📦 Installing client dependencies..."
cd client && npm install && cd ..

echo ""
echo "✅ InsightMint is ready!"
echo ""
echo "🚀 Run the app with: npm run dev"
echo ""
echo "📝 Optional: Add YouTube API key to server/.env for real video search"
echo "   (App works with mock data without a YouTube key)"
