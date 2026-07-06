import { useEffect, useRef, useState, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { 
  useListOpenaiConversations, 
  useGetOpenaiConversation, 
  useCreateOpenaiConversation,
  useListOpenaiMessages,
  getGetOpenaiConversationQueryKey,
  getListOpenaiConversationsQueryKey,
  getListOpenaiMessagesQueryKey,
  OpenaiMessage
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Send, Menu, X } from "lucide-react";
import finoraLogo from "@/assets/finora-logo.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { FormattedMessage } from "@/components/formatted-message";

export default function Chat() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const conversationIdStr = searchParams.get("id");
  const conversationId = conversationIdStr ? parseInt(conversationIdStr, 10) : null;

  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Queries
  const { data: conversations = [], isLoading: loadingConversations } = useListOpenaiConversations();
  
  const { data: currentConversation, isLoading: loadingConversation } = useGetOpenaiConversation(
    conversationId!,
    { query: { enabled: !!conversationId, queryKey: getGetOpenaiConversationQueryKey(conversationId!) } }
  );

  const { data: serverMessages = [], isLoading: loadingMessages } = useListOpenaiMessages(
    conversationId!,
    { query: { enabled: !!conversationId, queryKey: getListOpenaiMessagesQueryKey(conversationId!) } }
  );

  const createConversation = useCreateOpenaiConversation();

  // Sort conversations newest first
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [conversations]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [serverMessages, streamingMessage]);

  // If no ID is provided, but we have conversations, load the newest one
  useEffect(() => {
    if (!conversationId && conversations.length > 0) {
      setLocation(`/chat?id=${sortedConversations[0].id}`, { replace: true });
    }
  }, [conversationId, conversations, setLocation, sortedConversations]);

  const handleNewChat = () => {
    // Default to the plan of the current conversation, or FREE
    const plan = currentConversation?.plan || "FREE";
    createConversation.mutate(
      { data: { title: "New Conversation", plan } },
      {
        onSuccess: (newConv) => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          setLocation(`/chat?id=${newConv.id}`);
          setSidebarOpen(false);
        }
      }
    );
  };

  const handleSend = async () => {
    if (!input.trim() || !conversationId || isSending) return;

    const userMessageContent = input.trim();
    setInput("");
    setIsSending(true);

    // Optimistically update UI with user message
    const tempUserMessage: OpenaiMessage = {
      id: Date.now(), // fake id
      conversationId: conversationId,
      role: "user",
      content: userMessageContent,
      createdAt: new Date().toISOString()
    };

    queryClient.setQueryData(getListOpenaiMessagesQueryKey(conversationId), (old: OpenaiMessage[] | undefined) => {
      return [...(old || []), tempUserMessage];
    });

    try {
      const response = await fetch(`/api/openai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessageContent }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "Unknown error");
        throw new Error(`Server error ${response.status}: ${errText}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      setStreamingMessage("");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Accumulate chunks — SSE events can span multiple reads
        buffer += decoder.decode(value, { stream: true });

        // Process all complete SSE events (delimited by \n\n)
        const events = buffer.split("\n\n");
        // Keep the last (potentially incomplete) part in the buffer
        buffer = events.pop() ?? "";

        for (const event of events) {
          for (const line of event.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  setStreamingMessage((prev) => (prev || "") + data.content);
                }
                if (data.done) {
                  queryClient.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(conversationId) });
                  setStreamingMessage(null);
                }
                if (data.error) {
                  throw new Error(data.error);
                }
              } catch (e) {
                if (e instanceof SyntaxError) continue; // partial/malformed JSON, skip
                throw e;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Roll back the optimistic user message on error
      queryClient.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(conversationId) });
    } finally {
      setIsSending(false);
      setStreamingMessage(null);
      queryClient.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(conversationId) });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-card border-r flex flex-col transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 flex items-center justify-between border-b h-16 shrink-0">
          <button 
            onClick={() => setLocation("/")} 
            className="flex items-center gap-2 text-primary font-display font-bold text-xl hover:opacity-80 transition-opacity"
          >
            <img src={finoraLogo} alt="Finora" className="w-7 h-7 object-contain" />
            Finora
          </button>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-4">
          <Button 
            onClick={handleNewChat} 
            className="w-full justify-start gap-2 h-12 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium"
            variant="secondary"
          >
            <Plus className="w-4 h-4" />
            New Session
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2 pb-4">
          <div className="space-y-1">
            {loadingConversations ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : sortedConversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No past sessions</div>
            ) : (
              sortedConversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setLocation(`/chat?id=${conv.id}`);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex flex-col gap-1 p-3 rounded-xl text-left transition-colors ${
                    conversationId === conv.id 
                      ? 'bg-primary/10 text-primary' 
                      : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="font-medium truncate text-sm">
                    {conv.title || "Financial Session"}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs opacity-70">
                      {new Date(conv.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                    {conv.plan === "PRO" && (
                      <span className="text-[10px] font-bold text-accent px-1.5 py-0.5 rounded-sm bg-accent/10">PRO</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 border-b bg-background shrink-0 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden -ml-2" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-foreground truncate max-w-[160px] sm:max-w-xs">
                {currentConversation?.title || "Financial Session"}
              </h2>
              {currentConversation && (
                <Badge variant={currentConversation.plan === "PRO" ? "accent" : "secondary"} className="text-[10px] py-0">
                  {currentConversation.plan}
                </Badge>
              )}
            </div>
          </div>
          {/* Always-visible home button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="text-muted-foreground hover:text-foreground gap-1.5 text-xs hidden sm:flex"
          >
            <img src={finoraLogo} alt="" className="w-4 h-4 object-contain" />
            Home
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="sm:hidden"
            title="Back to home"
          >
            <img src={finoraLogo} alt="Home" className="w-5 h-5 object-contain" />
          </Button>
        </header>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth"
        >
          <div className="max-w-3xl mx-auto space-y-8 pb-4">
            {!loadingMessages && serverMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4 animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 p-3">
                  <img src={finoraLogo} alt="Finora" className="w-full h-full object-contain" />
                </div>
                <h3 className="font-display text-2xl font-bold">Karibu, I'm Finora.</h3>
                <p className="text-muted-foreground max-w-md">
                  I'm your personal financial coach. How are you feeling about your money today? What's on your mind?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mt-8">
                  {[
                    "I want to start saving but I don't know how.",
                    "How do I manage my debt?",
                    "Help me build a basic budget.",
                    "I have some extra income, what now?"
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(suggestion)}
                      className="text-left p-4 rounded-xl border bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm font-medium"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {serverMessages.map((msg, idx) => (
              <div 
                key={msg.id || idx} 
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 md:p-6 shadow-sm
                  ${msg.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-br-sm" 
                    : "bg-card border rounded-bl-sm"
                  }
                `}>
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-3 text-primary">
                      <img src={finoraLogo} alt="" className="w-4 h-4 object-contain" />
                      <span className="font-semibold text-sm">Finora</span>
                    </div>
                  )}
                  <div className={`text-[15px] leading-relaxed ${msg.role === "user" ? "text-primary-foreground" : "text-foreground"}`}>
                    <FormattedMessage content={msg.content} />
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming Message */}
            {streamingMessage !== null && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="max-w-[85%] md:max-w-[75%] rounded-2xl p-4 md:p-6 shadow-sm bg-card border rounded-bl-sm">
                  <div className="flex items-center gap-2 mb-3 text-primary">
                    <img src={finoraLogo} alt="" className="w-4 h-4 object-contain" />
                    <span className="font-semibold text-sm">Finora</span>
                  </div>
                  <div className="text-[15px] leading-relaxed text-foreground">
                    <FormattedMessage content={streamingMessage} />
                    <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            {isSending && streamingMessage === null && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="max-w-[85%] md:max-w-[75%] rounded-2xl p-4 md:p-6 shadow-sm bg-card border rounded-bl-sm flex gap-1 items-center h-16">
                  <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-background border-t">
          <div className="max-w-3xl mx-auto relative">
            <Textarea 
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Finora about your finances..."
              className="pr-14 min-h-[60px] max-h-[200px] py-4 rounded-[24px] shadow-sm border-border/60 focus-visible:ring-primary/20 focus-visible:border-primary bg-card"
              disabled={isSending || !conversationId}
            />
            <Button
              size="icon"
              className="absolute right-2 bottom-2 h-10 w-10 rounded-full"
              onClick={handleSend}
              disabled={!input.trim() || isSending || !conversationId}
            >
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </div>
          <div className="max-w-3xl mx-auto text-center mt-2">
            <span className="text-xs text-muted-foreground">
              Finora provides guidance, not professional financial advice.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
