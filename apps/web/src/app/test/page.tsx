"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TestPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-8">
          <h1 className="text-xl font-semibold">Test Page - No Auth</h1>
          <nav className="flex gap-4">
            <Link href="/dashboard" className="text-sm hover:underline">Dashboard</Link>
            <Link href="/keywords" className="text-sm hover:underline">Keywords</Link>
            <Link href="/rankings" className="text-sm hover:underline">Rankings</Link>
          </nav>
        </div>
      </header>

      <main className="container px-8 py-6 space-y-6">
        <h2 className="text-3xl font-bold">Test Page</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Card 1</h3>
            <p className="text-muted-foreground">This is a test card without authentication</p>
          </Card>
          
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Card 2</h3>
            <p className="text-muted-foreground">If you can see this, the app is working</p>
          </Card>
          
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Card 3</h3>
            <p className="text-muted-foreground">Navigate to other pages using links above</p>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="flex gap-2">
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
            <Link href="/keywords">
              <Button variant="outline">Go to Keywords</Button>
            </Link>
            <Link href="/rankings">
              <Button variant="outline">Go to Rankings</Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}