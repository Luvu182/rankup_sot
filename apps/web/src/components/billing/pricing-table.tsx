"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { PLAN_CONFIG, SubscriptionTier } from "@Rankup-manager/shared/lib/subscription";
import GlassCard from "@/components/ui/glass-card";
import GlassButton from "@/components/ui/glass-button";
import { Check, X, Zap } from "lucide-react";

/**
 * Pricing table component that integrates with Clerk Billing
 * 
 * To use Clerk's built-in pricing table:
 * 1. Import { PricingTable } from "@clerk/nextjs/experimental"
 * 2. Replace this component with <PricingTable />
 * 
 * This custom component gives more control over UI/UX
 */
export default function PricingTable() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (tier: SubscriptionTier) => {
    if (!userId) {
      router.push("/sign-in?redirect_url=/pricing");
      return;
    }

    setLoading(tier);

    try {
      // In production, this would redirect to Clerk's checkout
      // For now, we'll redirect to billing settings
      router.push(`/settings/billing?plan=${tier}`);
    } catch (error) {
      console.error("Error selecting plan:", error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Object.entries(PLAN_CONFIG).map(([tier, config]) => {
        const tierEnum = tier as SubscriptionTier;
        const isEnterprise = tierEnum === SubscriptionTier.ENTERPRISE;
        
        return (
          <GlassCard 
            key={tier}
            className={`p-6 relative ${
              config.highlighted 
                ? 'ring-2 ring-purple-500/50 bg-gradient-to-b from-purple-500/5 to-transparent' 
                : ''
            }`}
          >
            {config.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                {config.name}
              </h3>
              <p className="text-white/60 text-sm">
                {config.description}
              </p>
            </div>

            <div className="mb-6">
              {config.price !== null ? (
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-white">
                    ${config.price}
                  </span>
                  <span className="text-white/60 ml-1">/month</span>
                </div>
              ) : (
                <div className="text-2xl font-semibold text-white">
                  Custom Pricing
                </div>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              {config.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-white/80 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <GlassButton
              onClick={() => handleSelectPlan(tierEnum)}
              variant={config.highlighted ? "gradient" : "primary"}
              size="md"
              className="w-full"
              disabled={loading !== null}
            >
              {loading === tier ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Loading...
                </span>
              ) : isEnterprise ? (
                "Contact Sales"
              ) : (
                "Get Started"
              )}
            </GlassButton>
          </GlassCard>
        );
      })}
    </div>
  );
}

/**
 * Subscription management component for existing users
 */
export function SubscriptionManager({ 
  currentPlan = SubscriptionTier.FREE 
}: { 
  currentPlan?: SubscriptionTier 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      // This would open Stripe customer portal via Clerk
      // For now, redirect to billing settings
      router.push("/settings/billing");
    } catch (error) {
      console.error("Error managing subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Current Plan
          </h3>
          <p className="text-white/60">
            You are on the {PLAN_CONFIG[currentPlan].name} plan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-400" />
          <span className="text-xl font-semibold text-white">
            {PLAN_CONFIG[currentPlan].name}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Projects</span>
          <span className="text-white">
            {currentPlan === SubscriptionTier.ENTERPRISE 
              ? "Unlimited" 
              : `${PLAN_CONFIG[currentPlan].features[0]}`}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Keywords</span>
          <span className="text-white">
            {PLAN_CONFIG[currentPlan].features[1]}
          </span>
        </div>
      </div>

      <GlassButton
        onClick={handleManageSubscription}
        variant="secondary"
        size="md"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Loading..." : "Manage Subscription"}
      </GlassButton>
    </GlassCard>
  );
}