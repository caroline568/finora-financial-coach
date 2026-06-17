import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FinoraWordmark } from "./logo";
import { FeedbackDialog } from "./feedback-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { LayoutDashboard, MessageCircle, LogOut, Flame, Receipt, Target, ArrowLeftRight, Wallet, MessageSquarePlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface AppShellProps {
  children: React.ReactNode;
  user: { email?: string | null; name?: string | null };
  streak?: number;
}

export function AppShell({ children, user, streak }: AppShellProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navItems = [
    { to: "/app", label: "Today", icon: LayoutDashboard },
    { to: "/chat", label: "Coach", icon: MessageCircle },
  ];

  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/app" className="shrink-0">
            <FinoraWordmark />
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {navItems.map((item) => {
              const active =
                pathname === item.to ||
                (item.to !== "/app" && pathname.startsWith(item.to));
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {typeof streak === "number" && streak > 0 && (
              <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                <Flame className="h-3.5 w-3.5 text-accent" />
                {streak} day{streak === 1 ? "" : "s"}
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-secondary text-secondary-foreground font-semibold"
                >
                  {initial}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium">{user.name || "Friend"}</div>
                  <div className="text-xs font-normal text-muted-foreground truncate">
                    {user.email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/onboarding" })}>
                  Edit my profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <nav className="flex gap-1 border-t border-border/60 px-3 py-2 sm:hidden">
          {navItems.map((item) => {
            const active =
              pathname === item.to ||
              (item.to !== "/app" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <SecondaryNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}

function SecondaryNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/app") return null;
  const items = [
    { hash: "goal", label: "Goal", icon: Target },
    { hash: "bills", label: "Bills", icon: Receipt },
    { hash: "debts", label: "Debts", icon: Wallet },
    { hash: "activity", label: "Activity", icon: ArrowLeftRight },
  ];
  return (
    <div className="border-b border-border/60 bg-background/60">
      <div className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-3 py-2 sm:px-6">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.hash}
              href={`#${item.hash}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
