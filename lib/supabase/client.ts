import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// ダミークライアント（SSR時のプレースホルダー）
const createDummyClient = () => {
  return {
    auth: {
      signUp: async () => ({ data: null, error: new Error("Client not initialized") }),
      signInWithPassword: async () => ({ data: null, error: new Error("Client not initialized") }),
      updateUser: async () => ({ data: null, error: new Error("Client not initialized") }),
      getUser: async () => ({ data: null, error: new Error("Client not initialized") }),
      getSession: async () => ({ data: null, error: new Error("Client not initialized") }),
    },
    from: () => ({
      select: () => ({ data: null, error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
    }),
  } as unknown as SupabaseClient;
};

export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // ビルド時やSSR時で環境変数が未設定の場合はダミークライアントを返す
  if (!supabaseUrl || !supabaseAnonKey) {
    // クライアントサイドで環境変数が無いのは本当のエラー
    if (typeof window !== "undefined") {
      console.error("Missing Supabase environment variables");
    }
    return createDummyClient();
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
