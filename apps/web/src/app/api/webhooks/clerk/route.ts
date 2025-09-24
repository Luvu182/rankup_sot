import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@Rankup-manager/backend/convex/_generated/api";
import { clearUserCache } from '@/middleware/subscription';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Clerk webhook handler for user and subscription events
 * Configure webhook endpoint in Clerk Dashboard: https://dashboard.clerk.com/webhooks
 * 
 * Events to listen for:
 * - user.created
 * - user.updated (for subscription changes)
 * - organization.created
 * - organizationMembership.created
 * - subscription.created (if using Clerk Billing)
 * - subscription.updated
 * - subscription.deleted
 */
export async function POST(req: Request) {
  // Get headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // Verify headers exist
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create Svix instance
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

  let evt: WebhookEvent;

  // Verify webhook signature
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  // Handle events
  const eventType = evt.type;
  console.log(`[Webhook] Received: ${eventType}`);

  try {
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt.data);
        break;

      case 'user.updated':
        await handleUserUpdated(evt.data);
        break;

      case 'user.deleted':
        await handleUserDeleted(evt.data);
        break;

      case 'organization.created':
        await handleOrganizationCreated(evt.data);
        break;

      case 'organizationMembership.created':
        await handleOrganizationMembershipCreated(evt.data);
        break;

      case 'organizationMembership.deleted':
        await handleOrganizationMembershipDeleted(evt.data);
        break;

      // Clerk Billing events
      case 'subscription.created':
      case 'subscription.updated':
        await handleSubscriptionChange(evt.data);
        break;

      case 'subscription.deleted':
        await handleSubscriptionDeleted(evt.data);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${eventType}`);
    }

    return new Response('Success', { status: 200 });
  } catch (error) {
    console.error(`[Webhook] Error handling ${eventType}:`, error);
    return new Response('Error processing webhook', { status: 500 });
  }
}

/**
 * Handle new user creation
 */
async function handleUserCreated(userData: any) {
  console.log(`[Webhook] Creating user: ${userData.id}`);
  
  // Create user in Convex
  await convex.mutation(api.users.createUser, {
    clerkId: userData.id,
    email: userData.email_addresses[0]?.email_address || '',
    name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 
          userData.username || 
          'User',
  });
  
  // Note: Clerk Billing will automatically assign Free plan
  // No need to manually set subscription metadata
}

/**
 * Handle user updates (including subscription changes)
 */
async function handleUserUpdated(userData: any) {
  console.log(`[Webhook] User updated: ${userData.id}`);
  
  // Clear cache when user metadata changes
  // This ensures subscription limits are rechecked
  await clearUserCache(userData.id);
  
  // Update user info in Convex if needed
  const hasNameChange = userData.first_name || userData.last_name || userData.username;
  if (hasNameChange) {
    await convex.mutation(api.users.updateUser, {
      clerkId: userData.id,
      updates: {
        name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 
              userData.username || 
              'User',
      }
    });
  }
}

/**
 * Handle user deletion
 */
async function handleUserDeleted(userData: any) {
  console.log(`[Webhook] User deleted: ${userData.id}`);
  
  // Note: You may want to:
  // 1. Mark user as deleted in Convex (soft delete)
  // 2. Cancel any active subscriptions
  // 3. Archive their data
  // 4. Send confirmation email
}

/**
 * Handle organization creation
 */
async function handleOrganizationCreated(orgData: any) {
  console.log(`[Webhook] Organization created: ${orgData.id}`);
  
  // Organizations can have their own subscriptions
  // You might want to create an organization record in your database
}

/**
 * Handle organization membership changes
 */
async function handleOrganizationMembershipCreated(membershipData: any) {
  console.log(`[Webhook] User joined organization: ${membershipData.user_id}`);
  
  // Clear user cache to reflect new permissions
  await clearUserCache(membershipData.user_id);
}

async function handleOrganizationMembershipDeleted(membershipData: any) {
  console.log(`[Webhook] User left organization: ${membershipData.user_id}`);
  
  // Clear user cache to reflect removed permissions
  await clearUserCache(membershipData.user_id);
}

/**
 * Handle subscription changes (Clerk Billing)
 */
async function handleSubscriptionChange(subscriptionData: any) {
  console.log(`[Webhook] Subscription changed:`, {
    userId: subscriptionData.user_id,
    status: subscriptionData.status,
    plan: subscriptionData.items?.[0]?.price?.product?.name
  });
  
  // Clear cache to reflect new subscription limits
  if (subscriptionData.user_id) {
    await clearUserCache(subscriptionData.user_id);
  }
  
  // Note: Clerk automatically updates user metadata with subscription info
  // You don't need to manually update anything
  
  // Optional: Track subscription metrics
  // await trackSubscriptionMetrics(subscriptionData);
}

/**
 * Handle subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(subscriptionData: any) {
  console.log(`[Webhook] Subscription deleted: ${subscriptionData.user_id}`);
  
  // Clear cache
  if (subscriptionData.user_id) {
    await clearUserCache(subscriptionData.user_id);
  }
  
  // Note: Clerk automatically downgrades to free plan
  // You might want to:
  // 1. Send cancellation confirmation email
  // 2. Schedule data retention based on your policy
  // 3. Track churn metrics
}

/**
 * Optional: Track subscription metrics for analytics
 */
async function trackSubscriptionMetrics(subscriptionData: any) {
  // Example: Send to analytics service
  // await analytics.track('subscription_changed', {
  //   userId: subscriptionData.user_id,
  //   plan: subscriptionData.items?.[0]?.price?.product?.name,
  //   status: subscriptionData.status,
  //   amount: subscriptionData.items?.[0]?.price?.unit_amount,
  //   currency: subscriptionData.currency,
  // });
}