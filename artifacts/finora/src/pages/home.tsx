import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Check, ChevronRight } from "lucide-react";
import { useCreateOpenaiConversation } from "@workspace/api-client-react";
import finoraLogo from "@/assets/finora-logo.png";
import imgMamaMboga from "@/assets/hero-mama-mboga.jpg";
import imgConductor from "@/assets/hero-conductor.jpg";
import imgBodaRider from "@/assets/persona-boda-rider.jpg";
import imgStudent from "@/assets/persona-student.jpg";
import imgMjengo from "@/assets/persona-mjengo.jpg";
import imgGroup from "@/assets/persona-welcome-group.jpg";

/* ── Types ────────────────────────────────────────────────────────── */
type PersonaId = "conductor" | "mama-mboga" | "boda-rider" | "student" | "biashara";

const PERSONAS: {
  id: PersonaId;
  emoji: string;
  label: string;
  desc: string;
  image: string;
}[] = [
  {
    id: "conductor",
    emoji: "🚌",
    label: "Conductor",
    desc: "Manage your daily cash flow",
    image: imgConductor,
  },
  {
    id: "mama-mboga",
    emoji: "🥬",
    label: "Mama Mboga",
    desc: "Run & grow your biashara",
    image: imgMamaMboga,
  },
  {
    id: "boda-rider",
    emoji: "🏍️",
    label: "Boda Rider",
    desc: "Track fuel, rides & akiba",
    image: imgBodaRider,
  },
  {
    id: "student",
    emoji: "🎓",
    label: "Student",
    desc: "Budget your allowance smarter",
    image: imgStudent,
  },
  {
    id: "biashara",
    emoji: "🏪",
    label: "Small Business",
    desc: "Plan for growth, kidogo kidogo",
    image: imgMjengo,
  },
];

const TOTAL_SCREENS = 5;
const GREEN = "#1a6b3a";

/* ── Dot indicator ────────────────────────────────────────────────── */
function Dots({ current }: { current: number }) {
  return (
    <div className="flex justify-center gap-1.5 pt-3 pb-2">
      {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
        <span
          key={i}
          style={i === current ? { backgroundColor: GREEN } : {}}
          className={`rounded-full transition-all duration-300 ${
            i === current ? "w-6 h-[7px]" : "w-[7px] h-[7px] bg-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

/* ── Phone wrapper — full-screen on mobile, card on desktop ───────── */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#dde8e0] flex items-center justify-center lg:p-8 p-0">
      <div className="w-full max-w-[390px] h-[100dvh] lg:h-[820px] lg:rounded-[48px] lg:shadow-[0_40px_80px_rgba(0,0,0,0.25)] bg-[#f5f7f5] overflow-hidden relative flex flex-col">
        {children}
      </div>
    </div>
  );
}

/* ── Back button ──────────────────────────────────────────────────── */
function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm active:scale-95 transition-transform"
      aria-label="Rudi nyuma"
    >
      <ArrowLeft className="w-5 h-5 text-gray-700" />
    </button>
  );
}

/* ── Green CTA button ─────────────────────────────────────────────── */
function GreenBtn({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ backgroundColor: disabled ? undefined : GREEN }}
      className="w-full disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-[15px] rounded-2xl flex items-center justify-center gap-2 text-[15px] active:scale-[0.98] transition-transform"
    >
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  Main Component                                                    */
/* ══════════════════════════════════════════════════════════════════ */
export default function Home() {
  const [, setLocation] = useLocation();
  const [screen, setScreen] = useState(0);
  const [persona, setPersona] = useState<PersonaId | null>(null);
  const createConversation = useCreateOpenaiConversation();

  const next = () => setScreen((s) => Math.min(s + 1, TOTAL_SCREENS - 1));
  const back = () => setScreen((s) => Math.max(s - 1, 0));

  const openApp = () => {
    const found = PERSONAS.find((p) => p.id === persona);
    const title = found ? `${found.label} — New Session` : "New Conversation";
    createConversation.mutate(
      { data: { title, plan: "FREE" } },
      { onSuccess: (conv) => setLocation(`/chat?id=${conv.id}`) }
    );
  };

  /* ─── Screen 0 — HERO ────────────────────────────────────────── */
  if (screen === 0) {
    return (
      <PhoneFrame>
        <div className="relative h-full flex flex-col">
          {/* Background image */}
          <img
            src={imgMamaMboga}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/80" />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-2.5 px-6 pt-14">
            <img src={finoraLogo} alt="Finora" className="w-9 h-9 object-contain drop-shadow" />
            <span className="text-white font-extrabold text-2xl tracking-tight drop-shadow">
              Finora
            </span>
          </div>

          {/* Bottom copy */}
          <div className="relative z-10 mt-auto px-6 pb-6 space-y-5">
            <div>
              <h1 className="text-white font-extrabold text-[32px] leading-[1.15] drop-shadow-lg">
                Your personal<br />money coach.
              </h1>
              <p className="text-white/75 text-[15px] mt-2">
                Smart pesa moves. Every single day. 🔥
              </p>
            </div>

            <GreenBtn onClick={next}>
              Get Started <ArrowRight className="w-5 h-5" />
            </GreenBtn>

            <p className="text-center text-white/65 text-[13px]">
              Already have an account?{" "}
              <button
                onClick={openApp}
                style={{ color: "#4ade80" }}
                className="font-bold"
              >
                Log in
              </button>
            </p>

            <Dots current={screen} />
          </div>
        </div>
      </PhoneFrame>
    );
  }

  /* ─── Screen 1 — FEATURES ────────────────────────────────────── */
  if (screen === 1) {
    return (
      <PhoneFrame>
        <div className="flex flex-col h-full">
          {/* Nav */}
          <div className="px-5 pt-12 pb-3 flex items-center">
            <BackBtn onClick={back} />
          </div>

          {/* Image pill */}
          <div className="mx-5 rounded-3xl overflow-hidden h-52 shrink-0 shadow-md">
            <img
              src={imgConductor}
              alt="Conductor"
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Content */}
          <div className="flex-1 px-6 pt-6 pb-4 flex flex-col min-h-0">
            <h2 className="font-extrabold text-[22px] text-gray-900 leading-snug mb-1">
              Finora helps you control<br />your pesa every day.
            </h2>
            <p className="text-gray-400 text-[13px] mb-5">No jargon. No lectures. Just real talk. 💯</p>

            <ul className="space-y-4 flex-1">
              {[
                "Track your income & matumizi",
                "Save kidogo kidogo — consistently",
                "Get real financial coaching",
                "Reach your goals, step by step",
              ].map((feat) => (
                <li key={feat} className="flex items-center gap-3.5">
                  <span
                    style={{ backgroundColor: GREEN }}
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span className="text-gray-800 font-semibold text-[15px]">{feat}</span>
                </li>
              ))}
            </ul>

            <GreenBtn onClick={next}>
              Next <ArrowRight className="w-5 h-5" />
            </GreenBtn>
            <Dots current={screen} />
          </div>
        </div>
      </PhoneFrame>
    );
  }

  /* ─── Screen 2 — AI DEMO ─────────────────────────────────────── */
  if (screen === 2) {
    return (
      <PhoneFrame>
        <div className="flex flex-col h-full">
          <div className="px-5 pt-12 pb-3 flex items-center">
            <BackBtn onClick={back} />
          </div>

          {/* Image pill */}
          <div className="mx-5 rounded-3xl overflow-hidden h-44 shrink-0 shadow-md">
            <img
              src={imgBodaRider}
              alt="Boda rider"
              className="w-full h-full object-cover object-top"
            />
          </div>

          <div className="flex-1 px-6 pt-5 pb-4 flex flex-col min-h-0">
            <h2 className="font-extrabold text-[22px] text-gray-900 leading-snug">
              Your AI money coach,<br />available 24/7
            </h2>
            <p className="text-gray-400 text-[13px] mt-1 mb-4">
              Ask anything about your pesa. Finora's always got you. 🤝
            </p>

            {/* Chat preview card */}
            <div className="bg-white rounded-2xl p-4 space-y-3 flex-1 shadow-sm border border-gray-100 overflow-hidden">
              {/* User bubble */}
              <div className="flex justify-end">
                <div
                  style={{ backgroundColor: GREEN }}
                  className="text-white text-[13px] rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[78%]"
                >
                  Help me plan my budget for this week
                </div>
              </div>
              {/* Finora bubble */}
              <div className="flex gap-2 items-end">
                <img
                  src={finoraLogo}
                  alt="Finora"
                  className="w-7 h-7 rounded-full object-contain shrink-0 bg-primary/10 p-0.5"
                />
                <div className="bg-gray-50 border border-gray-100 text-gray-800 text-[13px] rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[78%]">
                  Sawa! Let's look at your income, matumizi, and goals. 💪
                </div>
              </div>
              {/* Typing indicator */}
              <div className="flex gap-2 items-end">
                <img
                  src={finoraLogo}
                  alt=""
                  className="w-7 h-7 rounded-full object-contain shrink-0 bg-primary/10 p-0.5 opacity-60"
                />
                <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <GreenBtn onClick={next}>
              Next <ArrowRight className="w-5 h-5" />
            </GreenBtn>
            <Dots current={screen} />
          </div>
        </div>
      </PhoneFrame>
    );
  }

  /* ─── Screen 3 — WHO ARE YOU? ────────────────────────────────── */
  if (screen === 3) {
    return (
      <PhoneFrame>
        <div className="flex flex-col h-full">
          <div className="px-5 pt-12 pb-2 flex items-center">
            <BackBtn onClick={back} />
          </div>

          <div className="flex-1 px-5 flex flex-col min-h-0 pb-4">
            <div className="mb-4">
              <h2 className="font-extrabold text-[22px] text-gray-900 leading-snug">
                Finora is for every Kenyan.
              </h2>
              <p className="text-gray-400 text-[13px] mt-1">
                How are you using it? Pick your vibe — we'll personalise things for you.
              </p>
            </div>

            {/* Persona list */}
            <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
              {PERSONAS.map((p) => {
                const active = persona === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPersona(p.id)}
                    style={active ? { borderColor: GREEN } : {}}
                    className={`w-full flex items-center gap-4 p-3.5 rounded-2xl border-2 transition-all text-left ${
                      active
                        ? "bg-[#f0f9f4]"
                        : "border-gray-100 bg-white hover:border-gray-200"
                    }`}
                  >
                    {/* Small persona photo */}
                    <img
                      src={p.image}
                      alt={p.label}
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-[14px] flex items-center gap-1.5">
                        <span>{p.emoji}</span> {p.label}
                      </p>
                      <p className="text-gray-400 text-[12px] mt-0.5">{p.desc}</p>
                    </div>
                    <ChevronRight
                      style={active ? { color: GREEN } : {}}
                      className="w-5 h-5 text-gray-200 shrink-0 transition-colors"
                    />
                  </button>
                );
              })}
            </div>

            <GreenBtn onClick={next} disabled={!persona}>
              Let's Go <ArrowRight className="w-5 h-5" />
            </GreenBtn>
            <Dots current={screen} />
          </div>
        </div>
      </PhoneFrame>
    );
  }

  /* ─── Screen 4 — WELCOME / SIGNUP ───────────────────────────── */
  return (
    <PhoneFrame>
      <div className="flex flex-col h-full">
        {/* Group photo — top half */}
        <div className="relative h-[46%] shrink-0">
          <img
            src={imgGroup}
            alt="Finora community"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#f5f7f5]" />
          {/* Back button */}
          <button
            onClick={back}
            className="absolute top-12 left-5 flex items-center justify-center w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm active:scale-95 transition-transform"
            aria-label="Rudi nyuma"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 pt-2 pb-6 flex flex-col">
          <div className="mb-auto">
            <h2 className="font-extrabold text-[26px] text-gray-900">
              Karibu, let's get it! 🎉
            </h2>
            <p className="text-gray-400 text-[14px] mt-1">
              Your money journey starts now. Tuko pamoja. 💚
            </p>
          </div>

          <div className="space-y-3 mt-6">
            {/* Primary CTA */}
            <GreenBtn onClick={openApp} disabled={createConversation.isPending}>
              {createConversation.isPending ? (
                "Setting up…"
              ) : (
                <>
                  Create Account <ArrowRight className="w-5 h-5" />
                </>
              )}
            </GreenBtn>

            {/* Google button */}
            <button
              onClick={openApp}
              disabled={createConversation.isPending}
              className="w-full bg-white border-2 border-gray-200 text-gray-800 font-bold py-[14px] rounded-2xl flex items-center justify-center gap-2.5 text-[15px] active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <p className="text-center text-[11px] text-gray-400 pt-1 leading-relaxed">
              By continuing you agree to Finora's{" "}
              <button className="underline focus:outline-none focus:ring-1 focus:ring-gray-400 rounded">Terms of Service</button>{" "}
              and{" "}
              <button className="underline focus:outline-none focus:ring-1 focus:ring-gray-400 rounded">Privacy Policy</button>.
            </p>
          </div>

          <Dots current={screen} />

          {/* Hidden admin link */}
          <a
            href="/admin"
            className="text-center text-[10px] text-gray-300 hover:text-gray-400 transition-colors mt-1"
          >
            Admin
          </a>
        </div>
      </div>
    </PhoneFrame>
  );
}
