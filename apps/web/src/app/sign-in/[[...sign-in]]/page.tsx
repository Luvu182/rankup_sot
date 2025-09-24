import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Rankup Manager</h1>
          <p className="text-muted-foreground mt-2">
            Đăng nhập để quản lý SEO rankings của bạn
          </p>
        </div>
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-none border",
            }
          }}
        />
      </div>
    </div>
  );
}