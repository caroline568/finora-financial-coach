import { useState } from "react";
import { useLocation } from "wouter";
import { Check, Leaf, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCreateOpenaiConversation } from "@workspace/api-client-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<"FREE" | "PRO">("FREE");
  const createConversation = useCreateOpenaiConversation();

  const handleStart = () => {
    createConversation.mutate(
      {
        data: {
          title: "New Conversation",
          plan: selectedPlan,
        },
      },
      {
        onSuccess: (conversation) => {
          setLocation(`/chat?id=${conversation.id}`);
        },
      }
    );
  };

  return (
    <div className="min-h-[100dvh] bg-background selection:bg-primary/20 flex flex-col">
      {/* Header */}
      <header className="px-6 py-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-display font-bold text-2xl tracking-tight">
          <Leaf className="w-8 h-8" />
          Finora
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-24">
        <div className="max-w-3xl w-full space-y-12 text-center">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-foreground leading-tight">
              A calm space for your <br />
              <span className="text-primary relative inline-block">
                financial clarity.
                <span className="absolute -bottom-2 left-0 w-full h-1 bg-accent rounded-full opacity-50"></span>
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Meet your personal financial coach. Practical advice, grounded insights, 
              and a clear path forward for everyday Kenyans. No jargon, just guidance.
            </p>
          </div>

          {/* Plan Picker */}
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto text-left mt-16">
            <button
              onClick={() => setSelectedPlan("FREE")}
              className={`relative text-left transition-all duration-300 rounded-3xl p-1 ${
                selectedPlan === "FREE" 
                  ? "bg-primary shadow-lg ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]" 
                  : "bg-card hover:bg-secondary/50 border border-border/50 hover:border-primary/30"
              }`}
            >
              <div className={`h-full rounded-[20px] p-6 lg:p-8 ${selectedPlan === "FREE" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                <h3 className="font-display text-2xl font-semibold mb-2">Essential</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold tracking-tight">Free</span>
                </div>
                <p className={`text-sm mb-8 ${selectedPlan === "FREE" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  Perfect for getting started with your financial journey.
                </p>
                <ul className="space-y-4">
                  {[
                    "Basic financial guidance",
                    "Budgeting tips",
                    "Expense review",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 shrink-0 ${selectedPlan === "FREE" ? "text-accent" : "text-primary"}`} />
                      <span className="text-sm font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </button>

            <button
              onClick={() => setSelectedPlan("PRO")}
              className={`relative text-left transition-all duration-300 rounded-3xl p-1 ${
                selectedPlan === "PRO" 
                  ? "bg-primary shadow-lg ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]" 
                  : "bg-card hover:bg-secondary/50 border border-border/50 hover:border-primary/30"
              }`}
            >
              <div className={`h-full rounded-[20px] p-6 lg:p-8 ${selectedPlan === "PRO" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-display text-2xl font-semibold">Premium</h3>
                  <Sparkles className={`w-5 h-5 ${selectedPlan === "PRO" ? "text-accent" : "text-accent"}`} />
                </div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold tracking-tight">Pro</span>
                </div>
                <p className={`text-sm mb-8 ${selectedPlan === "PRO" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  Advanced tools and deeper personalized insights.
                </p>
                <ul className="space-y-4">
                  {[
                    "Everything in Essential",
                    "Investment coaching",
                    "Long-term wealth planning",
                    "Priority responses"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 shrink-0 ${selectedPlan === "PRO" ? "text-accent" : "text-primary"}`} />
                      <span className="text-sm font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          </div>

          <div className="pt-10 flex flex-col items-center">
            <Button 
              size="lg" 
              className="rounded-full h-14 px-12 text-lg font-semibold bg-accent text-accent-foreground hover:bg-accent/90 shadow-xl shadow-accent/20 transition-all hover:-translate-y-1 w-full md:w-auto"
              onClick={handleStart}
              disabled={createConversation.isPending}
            >
              {createConversation.isPending ? "Setting up..." : "Start Coaching"}
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              Karibu. We're glad you're here.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
