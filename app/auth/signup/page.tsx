import AuthForm from "@/components/auth/auth-form";

// ビルド時の静的生成をスキップ
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <AuthForm mode="signup" />
    </div>
  );
}
