import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { getThreadMessages } from "@/lib/threads.functions";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { FinoraLogo } from "@/components/finora/logo";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

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
      onFirstAssistant={() => queryClient.invalidateQueries({ queryKey: ["threads"] })}
    />
  );
}

function ChatWindow({
  threadId,
  initialMessages,
  onFirstAssistant,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  onFirstAssistant: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    onFinish: () => onFirstAssistant(),
  });

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

  useEffect(() => {
    if (status === "ready") textareaRef.current?.focus();
  }, [status]);

  const handleSubmit = async (msg: PromptInputMessage) => {
    const text = msg.text.trim();
    if (!text) return;
    await sendMessage({ text });
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[500px] flex-col rounded-3xl border border-border bg-card">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <MessageCircle className="h-5 w-5" />
                </div>
              }
              title="What's on your mind today?"
              description="Tell me about a bill, a goal, or that thing keeping you up at 2am. I'll meet you there."
            />
          ) : (
            messages.map((m) => (
              <Message from={m.role} key={m.id}>
                {m.role === "assistant" ? (
                  <div className="flex w-full gap-3">
                    <FinoraLogo size={28} className="mt-1 shrink-0" />
                    <div className="flex-1 min-w-0 text-[15px] leading-relaxed text-foreground">
                      {m.parts.map((part, i) =>
                        part.type === "text" ? (
                          <MessageResponse key={i} className="prose-finora">{part.text}</MessageResponse>
                        ) : null,
                      )}
                    </div>
                  </div>
                ) : (
                  <MessageContent className="bg-primary text-primary-foreground">
                    {m.parts.map((part, i) =>
                      part.type === "text" ? <span key={i}>{part.text}</span> : null,
                    )}
                  </MessageContent>
                )}
              </Message>
            ))
          )}
          {status === "submitted" && (
            <div className="flex items-center gap-3 px-2 py-3">
              <FinoraLogo size={28} className="shrink-0" />
              <Shimmer className="text-sm">Finora is thinking…</Shimmer>
            </div>
          )}
          {error && messages.length === 0 && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error.message}
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-3 sm:p-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            ref={textareaRef}
            placeholder="Tell Finora what's going on…"
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={busy} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
