"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  initializeLiff,
  isInLineClient,
  isLoggedIn,
  getProfile,
  getAccessToken,
  getLiffContext,
  login,
  logout,
  closeWindow,
  getOS,
  type LiffProfile,
  type LiffContext as LiffContextType,
} from "@/lib/liff";

interface LiffState {
  isInitialized: boolean;
  isLoading: boolean;
  isInClient: boolean;
  isLoggedIn: boolean;
  profile: LiffProfile | null;
  accessToken: string | null;
  context: LiffContextType | null;
  os: "ios" | "android" | "web";
  error: Error | null;
}

interface LiffContextValue extends LiffState {
  login: (redirectUri?: string) => void;
  logout: () => void;
  closeWindow: () => void;
  refreshProfile: () => Promise<void>;
}

const LiffContext = createContext<LiffContextValue | null>(null);

interface LiffProviderProps {
  children: ReactNode;
  liffId?: string;
}

export function LiffProvider({ children, liffId }: LiffProviderProps) {
  const [state, setState] = useState<LiffState>({
    isInitialized: false,
    isLoading: true,
    isInClient: false,
    isLoggedIn: false,
    profile: null,
    accessToken: null,
    context: null,
    os: "web",
    error: null,
  });

  // LIFF初期化
  useEffect(() => {
    const init = async () => {
      // LIFF IDが設定されていない場合はスキップ（通常のWeb閲覧）
      const id = liffId || process.env.NEXT_PUBLIC_LIFF_ID;
      if (!id) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isInitialized: false,
        }));
        return;
      }

      try {
        const success = await initializeLiff(id);
        if (!success) {
          throw new Error("LIFF initialization failed");
        }

        const inClient = isInLineClient();
        const loggedIn = isLoggedIn();
        const os = getOS();
        const context = getLiffContext();

        let profile: LiffProfile | null = null;
        let accessToken: string | null = null;

        if (loggedIn) {
          profile = await getProfile();
          accessToken = getAccessToken();
        }

        setState({
          isInitialized: true,
          isLoading: false,
          isInClient: inClient,
          isLoggedIn: loggedIn,
          profile,
          accessToken,
          context,
          os,
          error: null,
        });
      } catch (error) {
        console.error("LIFF initialization error:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error("Unknown error"),
        }));
      }
    };

    init();
  }, [liffId]);

  // プロフィール再取得
  const refreshProfile = useCallback(async () => {
    if (!state.isLoggedIn) return;

    const profile = await getProfile();
    const accessToken = getAccessToken();

    setState((prev) => ({
      ...prev,
      profile,
      accessToken,
    }));
  }, [state.isLoggedIn]);

  // ログイン処理（ログイン後に状態を更新）
  const handleLogin = useCallback((redirectUri?: string) => {
    login(redirectUri);
  }, []);

  // ログアウト処理
  const handleLogout = useCallback(() => {
    logout();
    setState((prev) => ({
      ...prev,
      isLoggedIn: false,
      profile: null,
      accessToken: null,
    }));
  }, []);

  const value: LiffContextValue = {
    ...state,
    login: handleLogin,
    logout: handleLogout,
    closeWindow,
    refreshProfile,
  };

  return <LiffContext.Provider value={value}>{children}</LiffContext.Provider>;
}

/**
 * LIFFコンテキストを使用するカスタムフック
 */
export function useLiff() {
  const context = useContext(LiffContext);
  if (!context) {
    throw new Error("useLiff must be used within a LiffProvider");
  }
  return context;
}

/**
 * LINEアプリ内かどうかを確認するフック
 * Providerの外でも安全に使用可能
 */
export function useLiffOptional() {
  return useContext(LiffContext);
}
