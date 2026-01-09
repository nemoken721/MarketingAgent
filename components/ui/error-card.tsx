import { AlertCircle, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorCardProps {
  title?: string;
  message: string;
  variant?: "error" | "warning" | "info";
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorCard({
  title,
  message,
  variant = "error",
  onRetry,
  retryLabel = "再試行",
  className,
}: ErrorCardProps) {
  const variantStyles = {
    error: {
      container: "border-destructive bg-destructive/5",
      icon: "text-destructive",
      IconComponent: AlertCircle,
    },
    warning: {
      container: "border-yellow-500 bg-yellow-500/5",
      icon: "text-yellow-600 dark:text-yellow-500",
      IconComponent: AlertTriangle,
    },
    info: {
      container: "border-blue-500 bg-blue-500/5",
      icon: "text-blue-600 dark:text-blue-500",
      IconComponent: Info,
    },
  };

  const config = variantStyles[variant];
  const Icon = config.IconComponent;

  return (
    <div
      className={cn(
        "border rounded-lg p-4",
        config.container,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.icon)} />
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="font-semibold mb-1">{title}</h3>
          )}
          <p className="text-sm text-muted-foreground">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 簡略化されたバリアント
export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <ErrorCard variant="error" message={message} onRetry={onRetry} />;
}

export function WarningMessage({ message }: { message: string }) {
  return <ErrorCard variant="warning" message={message} />;
}

export function InfoMessage({ message }: { message: string }) {
  return <ErrorCard variant="info" message={message} />;
}
