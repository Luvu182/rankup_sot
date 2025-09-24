"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import AppLayout from "@/components/layout/app-layout";
import Loader from "@/components/loader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <>
      <AuthLoading>
        <Loader />
      </AuthLoading>
      
      <Unauthenticated>
        <RedirectToSignIn />
      </Unauthenticated>
      
      <Authenticated>
        <AppLayout>
          {children}
        </AppLayout>
      </Authenticated>
    </>
  );
}

function RedirectToSignIn() {
  const router = useRouter();
  
  useEffect(() => {
    router.push("/sign-in");
  }, [router]);
  
  return <Loader />;
}