import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Rankup Manager</h1>
          <p className="text-muted-foreground mt-2">
            Tạo tài khoản để bắt đầu theo dõi SEO
          </p>
        </div>
        <SignUp 
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