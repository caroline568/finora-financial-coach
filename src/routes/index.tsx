import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FinoraWordmark } from "@/components/finora/logo";
import heroImage from "@/assets/finora-hero.jpg";
import { Flame, MessageCircle, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Finora — your personal money coach" },
      {
        name: "description",
        content:
          "One money priority a day. Honest, warm coaching for the way you actually live — M-Pesa, chamas, family, all of it.",
      },
      { property: "og:title", content: "Finora — your personal money coach" },
      {
        property: "og:description",
        content:
          "The money coach you've never been able to afford — until now. Built for everyday Kenyans.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-paper text-foreground">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <FinoraWordmark />
        <div className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="rounded-full">
              Sign in
            </Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="sm" className="rounded-full">
              Get started
            </Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:pb-24 lg:pt-12">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Built for everyday Kenyans
          </div>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] text-balance sm:text-6xl lg:text-7xl">
            The money coach you've never been able to{" "}
            <span className="text-primary">afford</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground text-pretty">
            One clear priority a day. Honest answers, never lectures. Finora knows your numbers
            and meets you where you are — chama, M-Pesa, family, all of it.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="hero" className="group">
                Start free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="hero" variant="ghost">
                I already have an account
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-sm font-medium text-foreground/80">
            Free to start. No credit card needed.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            No bank connection. No spreadsheet. Just a coach in your corner.
          </p>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/15 via-accent/20 to-transparent blur-2xl" />
          <img
            src={heroImage}
            alt="A young woman smiling while using the Finora app on her phone in a warm-lit Nairobi cafe"
            width={1600}
            height={1100}
            className="aspect-[4/3] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-black/5"
          />
          {/* Phone mockup preview of the coach card */}
          <div className="absolute -bottom-8 -right-2 hidden w-[230px] rotate-3 rounded-[2rem] border-[10px] border-foreground bg-foreground p-0 shadow-2xl sm:block lg:-right-6 lg:w-[260px]">
            <div className="rounded-[1.25rem] bg-paper p-4">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>9:41</span>
                <span className="font-semibold text-foreground">Finora</span>
              </div>
              <div className="mt-3 rounded-2xl bg-primary p-3 text-primary-foreground">
                <div className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[9px] font-medium">
                  <Sparkles className="h-2.5 w-2.5" /> A message from Coach
                </div>
                <p className="mt-2 text-[13px] font-medium leading-snug">
                  Habari, Caroline. Set aside KES 500 today before any extras.
                </p>
                <p className="mt-2 text-[10px] text-primary-foreground/80">
                  Why: bills covered, emergency fund still thin.
                </p>
              </div>
              <div className="mt-3 flex gap-2 text-[10px] text-muted-foreground">
                <div className="flex-1 rounded-lg border border-border bg-card px-2 py-1.5">
                  <div className="font-semibold text-foreground">KES 35k</div>
                  <div>Income</div>
                </div>
                <div className="flex-1 rounded-lg border border-border bg-card px-2 py-1.5">
                  <div className="font-semibold text-foreground">3 day</div>
                  <div>Streak</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/40">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-16 sm:px-8 sm:grid-cols-3">
          <Feature
            icon={<Sparkles className="h-5 w-5" />}
            title="One priority a day"
            body="Not ten tips. One specific, doable move — tied to your goal and the numbers you actually have."
          />
          <Feature
            icon={<MessageCircle className="h-5 w-5" />}
            title="Coach, not chatbot"
            body="Warm like a sibling, direct like a mentor. Ask anything — debt order, school fees timing, the chama you joined."
          />
          <Feature
            icon={<Flame className="h-5 w-5" />}
            title="Streaks that feel like proof"
            body="Showing up daily isn't pressure — it's proof of who you're becoming. Hongera sana."
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 py-20 text-center sm:px-8">
        <h2 className="font-display text-4xl font-semibold text-balance sm:text-5xl">
          Money is hard. You don't have to figure it out alone.
        </h2>
        <p className="mt-5 text-lg text-muted-foreground text-pretty">
          Most people aren't bad with money — they just never had someone in their corner.
          Finora is that someone. Bora tuanze leo.
        </p>
        <div className="mt-8 flex justify-center">
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="hero">
              Start with Finora
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <p className="mt-6 inline-flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> Your numbers stay yours. We never sell data.
        </p>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-5 sm:flex-row sm:px-8">
          <FinoraWordmark />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Finora. Built with care.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground text-pretty">{body}</p>
    </div>
  );
}
