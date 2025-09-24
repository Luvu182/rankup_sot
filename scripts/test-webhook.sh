#!/bin/bash

# Test Clerk webhook với user.created event

echo "🧪 Testing Clerk webhook..."

# Webhook URL (local development)
WEBHOOK_URL="http://localhost:3001/api/webhooks/clerk"

# Example user.created payload
PAYLOAD='{
  "data": {
    "id": "user_test_123",
    "object": "user",
    "email_addresses": [
      {
        "email_address": "test@example.com",
        "id": "idn_test_123",
        "object": "email_address",
        "verification": {
          "status": "verified"
        }
      }
    ],
    "first_name": "Test",
    "last_name": "User",
    "username": "testuser",
    "created_at": 1234567890,
    "updated_at": 1234567890
  },
  "object": "event",
  "type": "user.created"
}'

# Send request với Svix headers (test mode)
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "svix-id: msg_test_123" \
  -H "svix-timestamp: $(date +%s)" \
  -H "svix-signature: v1,Gy5p5BYJvndZBHQsWnsNQQWUvXC3VXhiEB3iIAkQfPE=" \
  -d "$PAYLOAD" \
  -w "\nStatus: %{http_code}\n"

echo "✅ Webhook test sent!"
echo "Check your server logs for webhook processing"