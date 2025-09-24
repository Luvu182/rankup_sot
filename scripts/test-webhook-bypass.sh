#!/bin/bash

# Test webhook bỏ qua signature verification cho development

echo "🧪 Testing Clerk webhook (bypass signature)..."
echo "Note: Chỉ dùng cho development testing!"
echo ""

# User created event
echo "1. Testing user.created event..."
curl -X POST http://localhost:3001/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -H "svix-id: msg_test_user_created" \
  -H "svix-timestamp: $(date +%s)" \
  -H "svix-signature: bypass_development_only" \
  -d '{
    "data": {
      "id": "user_test_'$(date +%s)'",
      "email_addresses": [{
        "email_address": "test@example.com"
      }],
      "first_name": "Test",
      "last_name": "User",
      "username": "testuser"
    },
    "type": "user.created"
  }' \
  -s -w "\nStatus: %{http_code}\n\n"

# Subscription created event
echo "2. Testing subscription.created event..."
curl -X POST http://localhost:3001/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -H "svix-id: msg_test_sub_created" \
  -H "svix-timestamp: $(date +%s)" \
  -H "svix-signature: bypass_development_only" \
  -d '{
    "data": {
      "id": "sub_test_123",
      "user_id": "user_test_123",
      "status": "active",
      "items": [{
        "price": {
          "product": {
            "name": "Starter",
            "metadata": {
              "plan": "starter"
            }
          }
        }
      }]
    },
    "type": "subscription.created"
  }' \
  -s -w "\nStatus: %{http_code}\n\n"

echo "✅ Webhook tests completed!"
echo "Check server logs for processing details"