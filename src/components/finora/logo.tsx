import finoraMark from "@/assets/finora-mark.png";
import { cn } from "@/lib/utils";

export function FinoraLogo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <img
      src={finoraMark}
      alt="Finora"
      width={size}
      height={size}
      className={cn("inline-block select-none", className)}
      loading="eager"
    />
  );
}

export function FinoraWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <FinoraLogo size={28} />
      <span className="font-display text-xl font-semibold tracking-tight text-foreground">
        Finora
      </span>
    </span>
  );
}
