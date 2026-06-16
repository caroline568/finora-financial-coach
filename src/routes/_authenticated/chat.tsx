import { createFileRoute, Outlet, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listThreads, createThread, deleteThread } from "@/lib/threads.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { AppShell } from "@/components/finora/app-shell";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Trash2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "Coach — Finora" }] }),
  component: ChatLayout,
});

function ChatLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams({ strict: false }) as { threadId?: string };
  const activeId = params.threadId;
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  const fetchProfile = useServerFn(getMyProfile);
  const fetchThreads = useServerFn(listThreads);
  const createT = useServerFn(createThread);
  const removeT = useServerFn(deleteThread);

  const profileQuery = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });
  const threadsQuery = useQuery({ queryKey: ["threads"], queryFn: () => fetchThreads() });

  const createMut = useMutation({
    mutationFn: () => createT({ data: {} }),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: id } });
    },
  });

  // Auto-create or redirect to most recent thread when on /chat
  useEffect(() => {
    if (!threadsQuery.data || activeId) return;
    if (threadsQuery.data.threads.length > 0) {
      navigate({
        to: "/chat/$threadId",
        params: { threadId: threadsQuery.data.threads[0].id },
        replace: true,
      });
    }
    // No threads: render empty state with "Start" button
  }, [threadsQuery.data, activeId, navigate]);

  const profile = profileQuery.data?.profile;

  return (
    <AppShell user={{ email: userEmail, name: profile?.name }} streak={profile?.current_streak}>
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-4 px-2 py-4 sm:px-6 sm:py-6 md:gap-6">
        <aside className="hidden w-64 shrink-0 flex-col gap-3 md:flex">
          <Button
            className="rounded-full"
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
          >
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New conversation
          </Button>
          <div className="overflow-y-auto rounded-2xl border border-border bg-card">
            {threadsQuery.isLoading ? (
              <div className="flex justify-center p-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : threadsQuery.data?.threads.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">No conversations yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {threadsQuery.data?.threads.map((t) => {
                  const isActive = t.id === activeId;
                  return (
                    <li key={t.id} className={cn("group flex items-center", isActive && "bg-secondary")}>
                      <Link
                        to="/chat/$threadId"
                        params={{ threadId: t.id }}
                        className="flex-1 min-w-0 px-4 py-3"
                      >
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(t.updated_at), { addSuffix: true })}
                        </p>
                      </Link>
                      <button
                        type="button"
                        className="px-3 py-2 opacity-0 group-hover:opacity-100 transition"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!confirm("Delete this conversation?")) return;
                          try {
                            await removeT({ data: { id: t.id } });
                            queryClient.invalidateQueries({ queryKey: ["threads"] });
                            if (activeId === t.id) navigate({ to: "/chat" });
                            toast.success("Deleted");
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Failed");
                          }
                        }}
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
        <section className="flex min-w-0 flex-1 flex-col">
          {activeId ? (
            <Outlet />
          ) : threadsQuery.isLoading ? (
            <div className="grid flex-1 place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <EmptyChat onStart={() => createMut.mutate()} starting={createMut.isPending} />
          )}
        </section>
      </div>
    </AppShell>
  );
}

function EmptyChat({ onStart, starting }: { onStart: () => void; starting: boolean }) {
  return (
    <div className="grid flex-1 place-items-center rounded-3xl border border-border bg-card p-10 text-center">
      <div className="max-w-md">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <MessageCircle className="h-5 w-5" />
        </div>
        <h2 className="mt-5 font-display text-3xl font-semibold">Your coach is ready.</h2>
        <p className="mt-2 text-muted-foreground text-pretty">
          Ask anything about your money — bills, debts, that thing you're trying to save for.
          I know your numbers.
        </p>
        <Button className="mt-6 rounded-full" size="lg" onClick={onStart} disabled={starting}>
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Start a conversation
        </Button>
      </div>
    </div>
  );
}
