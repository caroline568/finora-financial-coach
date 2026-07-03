import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { getThreadMessages } from "@/lib/threads.functions";
import { FinoraLogo } from "@/components/finora/logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageCircle, SendHorizonal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ChatThread,
});

function ChatThread() {
  const { threadId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchMessages = useServerFn(getThreadMessages);

  const { data, isLoading } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => fetchMessages({ data: { threadId } }),
  });

  if (isLoading || !data) {
    return (
      <div className="grid flex-1 place-items-center rounded-3xl border border-border bg-card">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ChatWindow
      key={threadId}
      threadId={threadId}
      initialMessages={data.messages as UIMessage[]}
      onFinished={() => queryClient.invalidateQueries({ queryKey: ["threads"] })}
    />
  );
}

function ChatWindow({
  threadId,
  initialMessages,
  onFinished,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  onFinished: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages, id }) => ({
        body: { messages, threadId: id ?? threadId },
      }),
    }),
    onError: (err) => {
      toast.error(err.message || "Coach is having trouble right now.");
    },
    onFinish: () => onFinished(),
  });

  // Autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

  const busy = status === "submitted" || status === "streaming";

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[500px] flex-col rounded-3xl border border-border bg-card">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div className="max-w-md">
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-semibold">
                What's on your mind today?
              </h2>
              <p className="mt-2 text-muted-foreground text-pretty">
                Tell me about a bill, a goal, or that thing keeping you up at 2am. I'll meet you there.
              </p>
            </div>
          </div>
        ) : (
          <ul className="mx-auto flex max-w-2xl flex-col gap-5">
            {messages.map((m) => {
              const text = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              return (
                <li
                  key={m.id}
                  className={cn(
                    "flex gap-3",
                    m.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {m.role === "assistant" && (
                    <FinoraLogo size={28} className="mt-1 shrink-0" />
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
                      m.role === "user"
                        ? "whitespace-pre-wrap bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground",
                    )}
                  >
                    {m.role === "assistant" ? <CoachMessage text={text} /> : text}
                  </div>
                </li>
              );
            })}
            {status === "submitted" && (
              <li className="flex items-center gap-3">
                <FinoraLogo size={28} className="shrink-0" />
                <span className="text-sm text-muted-foreground animate-pulse">
                  Finora is thinking…
                </span>
              </li>
            )}
            {error && (
              <li className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error.message}
              </li>
            )}
          </ul>
        )}
      </div>

      <form onSubmit={submit} className="border-t border-border p-3 sm:p-4">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Tell Finora what's going on…"
            rows={1}
            className="min-h-[44px] max-h-40 resize-none rounded-2xl"
          />
          <Button
            type="submit"
            size="icon"
            disabled={busy || !input.trim()}
            className="h-11 w-11 shrink-0 rounded-full"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizonal className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Renders assistant text with **Bold** segments and preserves line breaks.
// Kept intentionally minimal — the model uses only **Label:** style bolding
// under the CHAT_REPLY_FORMAT_INSTRUCTION contract.
function CoachMessage({ text }: { text: string }) {
  const lines = text.split(/\n/);
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (line.trim() === "") return <div key={i} className="h-1" />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        return (
          <p key={i} className="whitespace-pre-wrap">
            {parts.map((seg, j) => {
              if (seg.startsWith("**") && seg.endsWith("**")) {
                return (
                  <strong key={j} className="font-semibold text-foreground">
                    {seg.slice(2, -2)}
                  </strong>
                );
              }
              return <span key={j}>{seg}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}
