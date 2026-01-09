"use client";

import { useEffect, useState } from "react";
import { MobileAppShell } from "./mobile-app-shell";
import { DesktopAppShell } from "./desktop-app-shell";

const DESKTOP_BREAKPOINT = 1024;

export function ResponsiveShell() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const checkDevice = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    };

    // Initial check
    checkDevice();

    // Listen for resize
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  // Show nothing while detecting (prevents flash)
  if (isDesktop === null) {
    return (
      <div className="h-screen w-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isDesktop ? <DesktopAppShell /> : <MobileAppShell />;
}
