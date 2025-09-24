# Clerk Billing Setup Guide

## Overview

This guide explains how to set up Clerk Billing for the Rankup subscription system.

## 1. Enable Clerk Billing in Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Monetization > Billing**
3. Click **Enable Billing**
4. Connect your Stripe account

## 2. Create Subscription Plans

In Clerk Dashboard > Monetization > Products:

### Free Plan
```
Name: Free
Price: $0/month
Features:
- max_projects: 1
- max_keywords_per_project: 100
- data_retention_days: 30
```

### Starter Plan
```
Name: Starter
Price: $29/month
Features:
- projects_5: true
- keywords_500: true
- data_retention_90: true
- competitor_tracking: true
- custom_reports: true
```

### Pro Plan
```
Name: Pro  
Price: $99/month
Features:
- projects_20: true
- keywords_2000: true
- data_retention_365: true
- api_access: true
- competitor_tracking: true
- custom_reports: true
- white_label: true
- priority_support: true
```

### Enterprise Plan
```
Name: Enterprise
Price: Custom (contact sales)
Features:
- unlimited_projects: true
- unlimited_keywords: true
- data_retention_unlimited: true
- api_access: true
- competitor_tracking: true
- custom_reports: true
- white_label: true
- priority_support: true
```

## 3. Configure Webhooks

1. Go to Clerk Dashboard > Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/clerk`
3. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `subscription.created`
   - `subscription.updated`
   - `subscription.deleted`

## 4. Environment Variables

Add to `.env.local`:

```bash
# Clerk Webhook Secret (from Dashboard > Webhooks)
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Already configured
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

## 5. Code Implementation

### Check Features in API Routes

```typescript
import { auth } from "@clerk/nextjs/server";

// Check if user has a feature
const { has } = await auth();
if (!has({ permission: "api_access" })) {
  return new Response("API access requires Pro plan", { status: 402 });
}
```

### Use Pricing Table Component

```tsx
// Option 1: Clerk's built-in component
import { PricingTable } from "@clerk/nextjs/experimental";

export function BillingPage() {
  return <PricingTable />;
}

// Option 2: Custom component (more control)
import PricingTable from "@/components/billing/pricing-table";

export function BillingPage() {
  return <PricingTable />;
}
```

### Protect Features in UI

```tsx
import { Protect } from "@clerk/nextjs";

// Only show for users with specific features
<Protect permission="api_access">
  <ApiKeyManager />
</Protect>

// Show upgrade prompt for others
<Protect permission="api_access" fallback={<UpgradePrompt />}>
  <ApiKeyManager />
</Protect>
```

## 6. Testing

### Test Stripe Integration

1. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

2. Test subscription flows:
   - New user signup → Free plan
   - Upgrade from Free → Starter
   - Downgrade from Pro → Starter
   - Cancel subscription → Free

### Test Webhook Events

```bash
# Use Clerk CLI to test webhooks locally
clerk-dev webhooks:forward https://localhost:3001/api/webhooks/clerk
```

## 7. Production Checklist

- [ ] Enable Clerk Billing in production
- [ ] Connect production Stripe account
- [ ] Create all subscription plans
- [ ] Configure production webhook endpoint
- [ ] Add webhook secret to production env
- [ ] Test full subscription flow
- [ ] Enable Stripe tax collection if needed
- [ ] Configure email receipts

## 8. Monitoring

### Track Subscription Metrics

```typescript
// In webhook handler
async function handleSubscriptionChange(data: any) {
  // Log to analytics
  await analytics.track('subscription_changed', {
    userId: data.user_id,
    plan: data.items[0].price.product.name,
    amount: data.items[0].price.unit_amount,
    status: data.status
  });
}
```

### Monitor Failed Payments

Set up alerts for:
- `subscription.payment_failed` events
- Users with `past_due` status
- High churn rate

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**
   - Check feature names match exactly
   - Verify user has active subscription
   - Clear Redis cache

2. **Webhook failures**
   - Verify webhook secret
   - Check endpoint is publicly accessible
   - Review webhook logs in Clerk Dashboard

3. **Subscription not updating**
   - Check webhook events are firing
   - Verify cache is being cleared
   - Check Clerk Dashboard for user's subscription status

## Resources

- [Clerk Billing Docs](https://clerk.com/docs/monetization/billing)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Webhook Debugging](https://clerk.com/docs/integrations/webhooks)