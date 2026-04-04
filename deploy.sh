#!/bin/bash

# Deploy script for etoro-trading project

set -e  # Exit on error

echo "📦 Starting deployment process..."

# Push to Git
echo "🔄 Pushing to Git repository..."
git push

# Push to Apps Script
echo "📤 Pushing code to Apps Script..."
clasp push

# Create a new version (history snapshot, unlimited)
echo "🏷️  Creating new version..."
clasp version "$(git log -1 --pretty=%B)"

echo "✅ Code pushed and versioned successfully!"
echo ""
echo "You can view your project with: clasp open"
