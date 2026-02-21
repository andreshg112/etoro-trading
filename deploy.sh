#!/bin/bash

# Deploy script for etoro-trading project
# This script:
# 1. Pushes code to Git repository
# 2. Pushes code to Google Apps Script
# 3. Creates a new version and deployment

set -e  # Exit on error

echo "📦 Starting deployment process..."

# Push to Git
echo "🔄 Pushing to Git repository..."
git push

# Push to Apps Script
echo "📤 Pushing code to Apps Script..."
clasp push

# Create a new version
echo "🏷️  Creating new version..."
VERSION_OUTPUT=$(clasp version "$(git log -1 --pretty=%B)")
echo "$VERSION_OUTPUT"

# Extract version number from output
VERSION_NUMBER=$(echo "$VERSION_OUTPUT" | grep -oP '\d+(?= Version)' || echo "$VERSION_OUTPUT" | grep -oP '(?<=Created version )\d+')

if [ -z "$VERSION_NUMBER" ]; then
    echo "⚠️  Could not extract version number. Skipping deployment."
    echo "✅ Code pushed successfully to Git and Apps Script."
    exit 0
fi

echo "📋 Version $VERSION_NUMBER created"

# Deploy the new version
echo "🚀 Creating deployment..."
DEPLOY_OUTPUT=$(clasp deploy --versionNumber "$VERSION_NUMBER" --description "$(git log -1 --pretty=%B)")
echo "$DEPLOY_OUTPUT"

echo "✅ Deployment complete!"
echo ""
echo "You can view your project with: clasp open"
