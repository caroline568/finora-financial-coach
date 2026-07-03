import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider, getLovableAiGatewayResponseHeaders, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader, LOVABLE_AIG_RUN_ID_HEADER } from "@/lib/ai-gateway.server";

interface ChatBody {
  messages?: UIMessage[];
  threadId?: string;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatBody;
        const { messages, threadId } = body;
        if (!Array.isArray(messages) || !threadId) {
          return new Response("Bad request", { status: 400 });
        }

        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice("Bearer ".length);

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return new Response("Server misconfig", { status: 500 });
        if (!LOVABLE_API_KEY) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: claimsRes, error: claimsErr } = await supabase.auth.getClaims(token);
        if (claimsErr || !claimsRes?.claims?.sub) return new Response("Unauthorized", { status: 401 });
        const userId = claimsRes.claims.sub as string;

        // Verify thread ownership
        const { data: thread } = await supabase
          .from("threads")
          .select("id, title")
          .eq("id", threadId)
          .eq("user_id", userId)
          .maybeSingle();
        if (!thread) return new Response("Thread not found", { status: 404 });

        // Build system prompt with user context
        const { loadFinanceContext } = await import("@/lib/finora-context.server");
        const { buildFinoraSystemPrompt, CHAT_REPLY_FORMAT_INSTRUCTION } = await import("@/lib/finora-prompt.server");
        const ctx = await loadFinanceContext(supabase, userId);
        const system = `${buildFinoraSystemPrompt(ctx)}\n\n---\n\n${CHAT_REPLY_FORMAT_INSTRUCTION}`;

        // Persist user message (the last one) before streaming
        const lastUser = messages.filter((m) => m.role === "user").at(-1);
        if (lastUser) {
          const text = lastUser.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("")
            .trim();
          await supabase.from("messages").insert({
            thread_id: threadId,
            user_id: userId,
            role: "user",
            parts: lastUser.parts as unknown as object[],
            content: text,
          });

          // If thread still has default title, auto-title from first user message
          if (thread.title === "New conversation" && text.length > 0) {
            const autoTitle = text.length > 60 ? `${text.slice(0, 57).trim()}…` : text;
            await supabase
              .from("threads")
              .update({ title: autoTitle })
              .eq("id", threadId)
              .eq("user_id", userId);
          }
        }

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(LOVABLE_API_KEY, initialRunId);
        const model = gateway("google/gemini-3-flash-preview");

        const modelMessages = await convertToModelMessages(messages);
        const result = streamText({
          model,
          system,
          messages: modelMessages,
        });

        const response = result.toUIMessageStreamResponse({
          originalMessages: messages,
          headers: getLovableAiGatewayResponseHeaders(undefined, {
            ...(initialRunId ? { [LOVABLE_AIG_RUN_ID_HEADER]: initialRunId } : {}),
          }),
          onFinish: async ({ messages: finalMessages }) => {
            // Persist any new assistant messages
            const assistant = finalMessages.filter((m) => m.role === "assistant");
            const newest = assistant.at(-1);
            if (newest) {
              const text = newest.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("")
                .trim();
              await supabase.from("messages").insert({
                thread_id: threadId,
                user_id: userId,
                role: "assistant",
                parts: newest.parts as unknown as object[],
                content: text,
              });
              await supabase
                .from("threads")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", threadId)
                .eq("user_id", userId);
            }
          },
        });

        return withLovableAiGatewayRunIdHeader(response, gateway);
      },
    },
  },
});
