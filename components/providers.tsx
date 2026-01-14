"use client";

import { ReactNode } from "react";
import { LiffProvider } from "@/context/liff-context";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <LiffProvider>{children}</LiffProvider>;
}
