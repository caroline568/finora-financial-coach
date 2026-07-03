import { useState } from "react";
import { useLocation } from "wouter";
import { Check, Sparkles, ArrowRight, ShieldCheck, TrendingUp, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateOpenaiConversation } from "@workspace/api-client-react";
import finoraLogo from "@/assets/finora-logo.png";

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
      <header className="px-6 py-5 lg:px-12 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-3">
          <img src={finoraLogo} alt="Finora" className="w-9 h-9 object-contain" />
          <span className="text-primary font-display font-bold text-2xl tracking-tight">Finora</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>Salama na ya kuaminika</span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col">

        {/* Hero section */}
        <section className="flex flex-col items-center justify-center px-4 pt-14 pb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-8 border border-primary/20">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Kwa kila mwananchi wa Kenya
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight text-foreground leading-[1.1] max-w-4xl">
            Mshauri wako wa{" "}
            <span className="text-primary relative inline-block">
              fedha
              <span className="absolute -bottom-1 left-0 w-full h-1.5 bg-accent rounded-full opacity-60" />
            </span>{" "}
            — daima yuko hapa.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Huna haja ya kwenda benki au kulipa mshauri ghali.
            Finora anakusaidia kudhibiti pesa yako — kuanzia mshahara,
            karo, hadi akiba yako ya mwezi — kwa lugha unayoielewa.
          </p>

          {/* Social proof / relatability */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {[
              "Ninahema mwezi mzima",
              "Sijui nianze wapi kuokoa",
              "Deni linanilemea",
              "Nataka kuwekeza lakini sijui",
            ].map((pain, i) => (
              <span
                key={i}
                className="text-sm bg-card border border-border/60 text-muted-foreground px-4 py-2 rounded-full"
              >
                "{pain}"
              </span>
            ))}
          </div>

          <p className="mt-4 text-sm text-primary font-medium">
            Finora anasikia — na ana jibu la vitendo.
          </p>
        </section>

        {/* How it works - 3 quick steps */}
        <section className="px-4 py-10 max-w-4xl mx-auto w-full">
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: <MessageCircle className="w-6 h-6 text-primary" />,
                title: "Mwambie hali yako",
                desc: "Sema tu kwa maneno yako — kama unavyoongea na rafiki. Hakuna fomu ngumu.",
              },
              {
                icon: <TrendingUp className="w-6 h-6 text-primary" />,
                title: "Pata ushauri wa vitendo",
                desc: "Finora akuambie: hali yako ni nini, inamaanisha nini, na hatua 1–3 za kufuata.",
              },
              {
                icon: <ShieldCheck className="w-6 h-6 text-primary" />,
                title: "Anza kubadilika leo",
                desc: "Kidogo kidogo, tabia nzuri za pesa zinaanza kukua. Finora anakufuatilia.",
              },
            ].map((step, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  {step.icon}
                </div>
                <h3 className="font-display font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Plan Picker */}
        <section className="px-4 py-8 max-w-2xl mx-auto w-full">
          <h2 className="text-center font-display font-bold text-2xl text-foreground mb-2">
            Chagua mpango wako
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-8">
            Anza bure — unaweza kubadilisha wakati wowote.
          </p>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* FREE Plan */}
            <button
              onClick={() => setSelectedPlan("FREE")}
              className={`relative text-left transition-all duration-300 rounded-3xl p-1 ${
                selectedPlan === "FREE"
                  ? "bg-primary shadow-xl ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]"
                  : "bg-card hover:bg-secondary/50 border border-border/50 hover:border-primary/30"
              }`}
            >
              <div className={`h-full rounded-[20px] p-6 ${selectedPlan === "FREE" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${selectedPlan === "FREE" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  Bure kabisa
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold tracking-tight">KSh 0</span>
                  <span className={`text-sm ${selectedPlan === "FREE" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>/mwezi</span>
                </div>
                <p className={`text-sm mb-6 ${selectedPlan === "FREE" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  Bora kwa kuanza safari yako ya fedha.
                </p>
                <ul className="space-y-3">
                  {[
                    "Ushauri wa msingi wa bajeti",
                    "Vidokezo vya kuokoa",
                    "Mapitio ya matumizi",
                    "Hadi mazungumzo 5 kwa siku",
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${selectedPlan === "FREE" ? "text-accent" : "text-primary"}`} />
                      <span className="text-sm font-medium">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </button>

            {/* PRO Plan */}
            <button
              onClick={() => setSelectedPlan("PRO")}
              className={`relative text-left transition-all duration-300 rounded-3xl p-1 ${
                selectedPlan === "PRO"
                  ? "bg-primary shadow-xl ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]"
                  : "bg-card hover:bg-secondary/50 border border-border/50 hover:border-primary/30"
              }`}
            >
              <div className={`h-full rounded-[20px] p-6 ${selectedPlan === "PRO" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-xs font-semibold uppercase tracking-widest ${selectedPlan === "PRO" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    Pro
                  </p>
                  <Sparkles className="w-4 h-4 text-accent" />
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold tracking-tight">KSh 199</span>
                  <span className={`text-sm ${selectedPlan === "PRO" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>/mwezi</span>
                </div>
                <p className={`text-sm mb-6 ${selectedPlan === "PRO" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  Uchambuzi wa kina na mipango ya muda mrefu.
                </p>
                <ul className="space-y-3">
                  {[
                    "Yote ya mpango wa bure",
                    "Uchambuzi wa matumizi kwa kina",
                    "Mpango wa bajeti kila wiki/mwezi",
                    "Tahadhari za matumizi mengi",
                    "Mwongozo wa kuwekeza (chini ya KSh 1M)",
                    "Majibu ya kipaumbele",
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${selectedPlan === "PRO" ? "text-accent" : "text-primary"}`} />
                      <span className="text-sm font-medium">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Button
              size="lg"
              className="rounded-full h-14 px-12 text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90 shadow-xl shadow-accent/20 transition-all hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto flex items-center gap-2"
              onClick={handleStart}
              disabled={createConversation.isPending}
            >
              {createConversation.isPending ? (
                "Inaandaa..."
              ) : (
                <>
                  Anza sasa — ni bure
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Hakuna kadi ya benki. Hakuna usajili mgumu.{" "}
              <span className="text-primary font-medium">Karibu.</span>
            </p>
          </div>
        </section>

        {/* Footer note */}
        <footer className="mt-auto px-6 py-6 text-center border-t border-border/40">
          <p className="text-xs text-muted-foreground">
            Finora hutoa ushauri wa elimu — si ushauri rasmi wa kifedha.
            Tafadhali wasiliana na mtaalamu wa fedha kwa maamuzi makubwa.
          </p>
        </footer>
      </main>
    </div>
  );
}
