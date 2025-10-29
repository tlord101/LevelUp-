#!/bin/bash

# Setup script for applying CORS configuration to Firebase Storage bucket
# This script configures CORS settings for the LevelUp Firebase Storage bucket

set -e

BUCKET="gs://levelup-87509.appspot.com"
CORS_FILE="cors.json"

echo "========================================="
echo "Firebase Storage CORS Configuration Setup"
echo "========================================="
echo ""

# Check if cors.json exists
if [ ! -f "$CORS_FILE" ]; then
    echo "Error: $CORS_FILE not found!"
    echo "Please ensure cors.json is in the current directory."
    exit 1
fi

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo "Error: gsutil is not installed!"
    echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check authentication
echo "Checking Google Cloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo ""
    echo "You are not authenticated with Google Cloud."
    echo "Please run: gcloud auth login"
    echo "Then run this script again."
    exit 1
fi

echo "Authenticated user: $(gcloud auth list --filter=status:ACTIVE --format='value(account)')"
echo ""

# Apply CORS configuration
echo "Applying CORS configuration to $BUCKET..."
echo ""

if gsutil cors set "$CORS_FILE" "$BUCKET"; then
    echo ""
    echo "✓ CORS configuration applied successfully!"
    echo ""
    echo "To verify the configuration, run:"
    echo "  gsutil cors get $BUCKET"
else
    echo ""
    echo "✗ Failed to apply CORS configuration."
    echo "Please check your permissions and try again."
    exit 1
fi

echo ""
echo "========================================="
echo "Setup complete!"
echo "========================================="
