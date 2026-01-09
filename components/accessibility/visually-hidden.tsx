import { cn } from "@/lib/utils";

/**
 * VisuallyHidden コンポーネント
 * スクリーンリーダー用のテキストを視覚的に隠すが、読み上げは可能にする
 */
interface VisuallyHiddenProps {
  children: React.ReactNode;
  className?: string;
}

export function VisuallyHidden({ children, className }: VisuallyHiddenProps) {
  return (
    <span
      className={cn(
        "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
        "clip-[rect(0,0,0,0)]",
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * ARIA Live Region コンポーネント
 * 動的コンテンツの変更をスクリーンリーダーに通知
 */
interface AriaLiveProps {
  children: React.ReactNode;
  politeness?: "polite" | "assertive" | "off";
  atomic?: boolean;
  relevant?:
    | "additions"
    | "removals"
    | "text"
    | "all"
    | "additions text"
    | "additions removals";
}

export function AriaLive({
  children,
  politeness = "polite",
  atomic = true,
  relevant = "additions text",
}: AriaLiveProps) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className="sr-only"
    >
      {children}
    </div>
  );
}
