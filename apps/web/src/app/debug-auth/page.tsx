"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@Rankup-manager/backend/convex/_generated/api";

export default function DebugAuth() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const authTest = useQuery(api.debug.testAuth);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Authentication</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Clerk Status:</h2>
          <pre className="text-sm">{JSON.stringify({
            loaded: clerkLoaded,
            signedIn: !!user,
            userId: user?.id,
            email: user?.primaryEmailAddress?.emailAddress,
          }, null, 2)}</pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Convex Auth Test:</h2>
          <pre className="text-sm">{JSON.stringify(authTest, null, 2)}</pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Environment Check:</h2>
          <pre className="text-sm">{JSON.stringify({
            NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
            NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? "Set" : "Not set",
          }, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}