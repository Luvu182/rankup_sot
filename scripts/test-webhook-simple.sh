#!/bin/bash

echo "🧪 Testing webhook endpoint..."

# Check if server is running
echo "Checking server status..."
curl -s -o /dev/null -w "Server status: %{http_code}\n" http://localhost:3001/

echo ""
echo "Sending test webhook..."

# Simple test without signature verification
curl -X POST http://localhost:3001/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -d '{"type":"test","data":{}}' \
  -w "\nWebhook response: %{http_code}\n"