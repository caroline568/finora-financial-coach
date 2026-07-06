import { useState } from "react";
import { useLocation } from "wouter";
import { Check, Sparkles, ArrowRight, ShieldCheck, TrendingUp, MessageCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateOpenaiConversation } from "@workspace/api-client-react";
import finoraLogo from "@/assets/finora-logo.png";
import heroConductor from "@/assets/hero-conductor.jpg";
import heroMamaMboga from "@/assets/hero-mama-mboga.jpg";
import { MpesaModal } from "@/components/mpesa-modal";

type Duration = "daily" | "weekly" | "monthly";

const PRO_DURATIONS: { key: Duration; label: string; amount: number; period: string; tagline: string }[] = [
  { key: "daily",   label: "Day pass",    amount: 10,  period: "24 hours",  tagline: "Less than a boda fare" },
  { key: "weekly",  label: "Week pass",   amount: 50,  period: "7 days",    tagline: "Less than lunch money" },
  { key: "monthly", label: "Month pass",  amount: 199, period: "30 days",   tagline: "Under KSh 7 a day" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<"FREE" | "PRO">("FREE");
  const [selectedDuration, setSelectedDuration] = useState<Duration>("weekly");
  const [showMpesa, setShowMpesa] = useState(false);
  const createConversation = useCreateOpenaiConversation();

  const activeDuration = PRO_DURATIONS.find((d) => d.key === selectedDuration)!;

  const handleStart = () => {
    if (selectedPlan === "PRO") {
      setShowMpesa(true);
      return;
    }
    createConversation.mutate(
      { data: { title: "New Conversation", plan: "FREE" } },
      { onSuccess: (conv) => setLocation(`/chat?id=${conv.id}`) }
    );
  };

  const handlePaid = (checkoutRequestId: string) => {
    setShowMpesa(false);
    createConversation.mutate(
      {
        data: {
          title: "New Conversation",
          plan: "PRO",
          // @ts-expect-error — extra field passed through for payment verification
          checkoutRequestId,
        },
      },
      { onSuccess: (conv) => setLocation(`/chat?id=${conv.id}`) }
    );
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col selection:bg-primary/20">

      {/* Header */}
      <header className="px-6 py-5 lg:px-12 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-3">
          <img src={finoraLogo} alt="Finora" className="w-9 h-9 object-contain" />
          <span className="text-primary font-display font-bold text-2xl tracking-tight">Finora</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>Secure &amp; trusted</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="grid lg:grid-cols-2 gap-0 min-h-[520px]">

          {/* Left: copy */}
          <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-14 space-y-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full w-fit border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              For everyday Kenyans
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-foreground leading-[1.08]">
                Your personal<br />
                <span className="text-primary relative">
                  money coach
                  <span className="absolute -bottom-1 left-0 w-full h-1.5 bg-accent rounded-full opacity-70" />
                </span>.
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                Whether you're living paycheck to paycheck, drowning in loans, or just trying to
                save that first KSh 10,000 — Finora gets you. No jargon, no judgment, just real talk.
              </p>
            </div>

            {/* Pain chips */}
            <div className="flex flex-wrap gap-2.5">
              {[
                "Broke before month-end",
                "Can't start saving",
                "Loans piling up",
                "Want to invest but lost",
              ].map((pain, i) => (
                <span key={i} className="text-sm bg-card border border-border/60 text-muted-foreground px-3.5 py-1.5 rounded-full">
                  "{pain}"
                </span>
              ))}
            </div>
            <p className="text-sm text-primary font-semibold -mt-2">
              Finora's got answers — karibu.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="rounded-full h-13 px-10 text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
                onClick={handleStart}
                disabled={createConversation.isPending}
              >
                {createConversation.isPending ? "Setting up…" : (
                  <>Start for free <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
              <p className="flex items-center text-sm text-muted-foreground sm:self-center">
                No card needed. No sign-up.
              </p>
            </div>
          </div>

          {/* Right: two hero images stacked */}
          <div className="hidden lg:grid grid-rows-2 relative overflow-hidden bg-primary/5 gap-0.5">
            {/* Top — conductor */}
            <div className="relative overflow-hidden">
              <img
                src={heroConductor}
                alt="Kenyan matatu conductor"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow">
                <p className="font-semibold text-foreground text-xs">Kamau, Conductor</p>
                <p className="text-[11px] text-muted-foreground">Saved KSh 4,500 in 3 weeks</p>
              </div>
            </div>
            {/* Bottom — mama mboga */}
            <div className="relative overflow-hidden">
              <img
                src={heroMamaMboga}
                alt="Kenyan mama mboga market vendor"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow">
                <p className="font-semibold text-foreground text-xs">Wanjiku, Mama Mboga</p>
                <p className="text-[11px] text-muted-foreground">Grew savings by 30% this month</p>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile hero images */}
        <div className="lg:hidden grid grid-cols-2 gap-0.5 h-48 overflow-hidden">
          <div className="relative overflow-hidden">
            <img src={heroConductor} alt="Matatu conductor" className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <p className="absolute bottom-2 left-2 text-white text-[10px] font-medium drop-shadow">Kamau, Conductor</p>
          </div>
          <div className="relative overflow-hidden">
            <img src={heroMamaMboga} alt="Mama mboga vendor" className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <p className="absolute bottom-2 left-2 text-white text-[10px] font-medium drop-shadow">Wanjiku, Mama Mboga</p>
          </div>
        </div>

        {/* ── How it works ──────────────────────────────────────── */}
        <section className="px-4 sm:px-8 py-12 max-w-5xl mx-auto w-full">
          <h2 className="font-display font-bold text-2xl text-foreground text-center mb-8">
            Simple as texting a friend
          </h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                icon: <MessageCircle className="w-6 h-6 text-primary" />,
                title: "Tell Finora what's up",
                desc: "Just talk normally. \"Nimeenda broke wiki moja kabla ya mwisho wa mwezi\" — Finora gets it.",
              },
              {
                icon: <TrendingUp className="w-6 h-6 text-primary" />,
                title: "Get a real action plan",
                desc: "Not generic advice. Finora breaks it down: what's happening, why it matters, and exactly what to do next.",
              },
              {
                icon: <ShieldCheck className="w-6 h-6 text-primary" />,
                title: "Build better habits",
                desc: "Small wins compound. Finora keeps you on track — no lectures, just consistent nudges toward your goals.",
              },
            ].map((step, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-2xl p-6 space-y-3">
                <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center">
                  {step.icon}
                </div>
                <h3 className="font-display font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Plan Picker ───────────────────────────────────────── */}
        <section className="px-4 py-10 max-w-2xl mx-auto w-full">
          <div className="text-center mb-8 space-y-2">
            <h2 className="font-display font-bold text-2xl text-foreground">Pick your plan</h2>
            <p className="text-sm text-muted-foreground">
              Pay like buying airtime — daily, weekly, or monthly. No subscription traps.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* FREE */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPlan("FREE")}
              onKeyDown={(e) => e.key === "Enter" && setSelectedPlan("FREE")}
              className={`relative text-left cursor-pointer transition-all duration-300 rounded-3xl p-1 ${
                selectedPlan === "FREE"
                  ? "bg-primary shadow-xl ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]"
                  : "bg-card hover:bg-secondary/40 border border-border/50 hover:border-primary/30"
              }`}
            >
              <div className={`h-full rounded-[20px] p-6 ${selectedPlan === "FREE" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${selectedPlan === "FREE" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  Free forever
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-extrabold">KSh 0</span>
                </div>
                <p className={`text-sm mb-5 ${selectedPlan === "FREE" ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                  Real coaching, no strings.
                </p>
                <ul className="space-y-3">
                  {[
                    "Budgeting basics",
                    "Saving tips & tricks",
                    "Spending checkups",
                    "Up to 5 chats/day",
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm font-medium">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${selectedPlan === "FREE" ? "text-accent" : "text-primary"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* PRO */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPlan("PRO")}
              onKeyDown={(e) => e.key === "Enter" && setSelectedPlan("PRO")}
              className={`relative text-left cursor-pointer transition-all duration-300 rounded-3xl p-1 ${
                selectedPlan === "PRO"
                  ? "bg-primary shadow-xl ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]"
                  : "bg-card hover:bg-secondary/40 border border-border/50 hover:border-primary/30"
              }`}
            >
              <div className={`h-full rounded-[20px] p-6 ${selectedPlan === "PRO" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-xs font-bold uppercase tracking-widest ${selectedPlan === "PRO" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>Pro</p>
                  <Sparkles className="w-4 h-4 text-accent" />
                </div>

                {/* Duration picker — uses buttons (valid inside a div) */}
                <div className={`flex gap-1.5 mb-3 rounded-xl p-1 ${selectedPlan === "PRO" ? "bg-primary-foreground/10" : "bg-secondary/50"}`}>
                  {PRO_DURATIONS.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedPlan("PRO"); setSelectedDuration(d.key); }}
                      className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${
                        selectedDuration === d.key
                          ? selectedPlan === "PRO"
                            ? "bg-white/20 text-white"
                            : "bg-primary text-primary-foreground"
                          : selectedPlan === "PRO"
                            ? "text-primary-foreground/60 hover:text-primary-foreground/80"
                            : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-baseline gap-1 mb-0.5">
                  <span className="text-3xl font-extrabold">KSh {activeDuration.amount}</span>
                  <span className={`text-sm ${selectedPlan === "PRO" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    /{activeDuration.period}
                  </span>
                </div>
                <div className={`flex items-center gap-1.5 text-xs mb-4 ${selectedPlan === "PRO" ? "text-accent" : "text-primary"}`}>
                  <Zap className="w-3 h-3" />
                  <span>{activeDuration.tagline}</span>
                </div>

                <ul className="space-y-3">
                  {[
                    "Everything in Free",
                    "Deep spending analysis",
                    "Weekly & monthly plans",
                    "Overspending alerts",
                    "Investment starter guide",
                    "Priority responses",
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm font-medium">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${selectedPlan === "PRO" ? "text-accent" : "text-primary"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Button
              size="lg"
              className="rounded-full h-14 px-12 text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90 shadow-xl shadow-accent/20 transition-all hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto flex items-center gap-2"
              onClick={handleStart}
              disabled={createConversation.isPending}
            >
              {createConversation.isPending ? "Setting up…" : selectedPlan === "PRO" ? (
                <>Pay KSh {activeDuration.amount} via M-Pesa <ArrowRight className="w-5 h-5" /></>
              ) : (
                <>Start for free <ArrowRight className="w-5 h-5" /></>
              )}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {selectedPlan === "PRO"
                ? "M-Pesa PIN prompt sent straight to your phone. No card needed."
                : <>No credit card. No sign-up.{" "}<span className="text-primary font-medium">Karibu sana.</span></>
              }
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto px-6 py-5 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Finora provides financial education — not regulated financial advice. For big decisions, talk to a certified advisor.
          </p>
          <a
            href="/admin"
            className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
          >
            Admin
          </a>
        </footer>
      </main>

      {/* M-Pesa Payment Modal */}
      <MpesaModal
        open={showMpesa}
        duration={selectedDuration}
        amount={activeDuration.amount}
        onClose={() => setShowMpesa(false)}
        onPaid={handlePaid}
      />
    </div>
  );
}
