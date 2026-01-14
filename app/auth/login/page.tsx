import AuthForm from "@/components/auth/auth-form";

// ビルド時の静的生成をスキップ（Supabase環境変数が必要なため）
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <AuthForm mode="login" />
    </div>
  );
}
