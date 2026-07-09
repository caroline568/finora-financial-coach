import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import finoraLogo from "@/assets/finora-logo.png";
import { useCreateUser, OCCUPATIONS, INCOME_RANGES, CHALLENGES } from "@/hooks/useUser";

const GREEN = "#22c55e";

type Step = 0 | 1 | 2;

export default function Signup() {
  const [, setLocation] = useLocation();
  const createUser = useCreateUser();
  const [step, setStep] = useState<Step>(0);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [occupation, setOccupation] = useState("");
  const [incomeType, setIncomeType] = useState("");
  const [incomeRange, setIncomeRange] = useState("");
  const [dependants, setDependants] = useState(0);
  const [challenges, setChallenges] = useState<string[]>([]);

  const toggleChallenge = (c: string) =>
    setChallenges(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const nextStep = () => {
    setError(null);
    if (step === 0) {
      if (!name.trim()) { setError("Please enter your name."); return; }
      if (!phone.trim() && !email.trim()) { setError("Add a phone or email so we can recognise you."); return; }
    }
    if (step === 1) {
      if (!occupation) { setError("Tell us what you do."); return; }
      if (!incomeRange) { setError("Pick an income range."); return; }
    }
    setStep((step + 1) as Step);
  };

  const handleSubmit = () => {
    setError(null);
    const payload = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      occupation,
      incomeType: incomeType || undefined,
      incomeRange,
      dependants,
      financialChallenges: challenges.length > 0 ? JSON.stringify(challenges) : undefined,
      authProvider: "email",
    };
    createUser.mutate(payload, {
      onSuccess: () => setLocation("/dashboard"),
      onError: () => setError("Something went wrong. Jaribu tena."),
    });
  };

  /* ── Google shortcut ── */
  const handleGoogle = () => {
    // Stub: in production wire to Google OAuth
    if (!name.trim()) {
      setError("Enter your name first, then tap Google.");
      return;
    }
    createUser.mutate(
      { name: name.trim(), authProvider: "google" },
      { onSuccess: () => setLocation("/dashboard") }
    );
  };

  /* ── progress dots ── */
  const dots = [0, 1, 2];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start px-4 pt-12 pb-8">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          {step > 0 && (
            <button onClick={() => setStep((step - 1) as Step)} className="mr-2 p-2 rounded-full hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <img src={finoraLogo} alt="Finora" className="w-8 h-8 object-contain" />
          <span className="font-extrabold text-xl text-gray-900">Finora</span>
          <div className="flex gap-1.5 ml-auto">
            {dots.map(i => (
              <div key={i} style={{ backgroundColor: i <= step ? GREEN : undefined }}
                className={`w-2 h-2 rounded-full transition-colors ${i <= step ? "" : "bg-gray-200"}`} />
            ))}
          </div>
        </div>

        {/* ── Step 0: Basic info ──────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Let's get started.</h1>
              <p className="text-gray-400 text-sm mt-1">Create your Finora account — takes 60 seconds.</p>
            </div>

            {/* Google CTA */}
            <button
              onClick={handleGoogle}
              className="w-full bg-white border-2 border-gray-200 text-gray-800 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2.5 text-[15px] active:scale-[0.98] transition-transform"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">or fill in manually</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="space-y-3">
              <Field label="Full name *" value={name} onChange={setName} placeholder="e.g. John Kamau" />
              <Field label="Phone (M-Pesa)" value={phone} onChange={setPhone} placeholder="e.g. 0712 345 678" type="tel" />
              <Field label="Email (optional)" value={email} onChange={setEmail} placeholder="john@email.com" type="email" />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <BigBtn onClick={nextStep}>
              Next <ArrowRight className="w-5 h-5" />
            </BigBtn>
          </div>
        )}

        {/* ── Step 1: Work & income ───────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Your hustle.</h1>
              <p className="text-gray-400 text-sm mt-1">This helps Finora coach you better.</p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">What do you do?</label>
              <div className="grid grid-cols-2 gap-2">
                {OCCUPATIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setOccupation(o.value)}
                    style={occupation === o.value ? { borderColor: GREEN, backgroundColor: "#f0fdf4" } : {}}
                    className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${occupation === o.value ? "" : "border-gray-100 bg-white"}`}
                  >
                    <span className="text-sm font-bold text-gray-900">{o.label}</span>
                    <span className="text-[11px] text-gray-400 mt-0.5">{o.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">How do you earn?</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "salary", label: "💼 Fixed Salary" },
                  { value: "daily", label: "📅 Daily Earnings" },
                  { value: "irregular", label: "🔄 Irregular / Casual" },
                  { value: "business", label: "🏪 Business Income" },
                ].map(t => (
                  <button key={t.value} onClick={() => setIncomeType(t.value)}
                    style={incomeType === t.value ? { borderColor: GREEN, backgroundColor: "#f0fdf4" } : {}}
                    className={`p-3 rounded-xl border-2 text-sm font-semibold text-gray-800 text-left transition-all ${incomeType === t.value ? "" : "border-gray-100 bg-white"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Monthly income range *</label>
              <div className="space-y-2">
                {INCOME_RANGES.map(r => (
                  <button key={r.value} onClick={() => setIncomeRange(r.value)}
                    style={incomeRange === r.value ? { borderColor: GREEN, backgroundColor: "#f0fdf4" } : {}}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${incomeRange === r.value ? "" : "border-gray-100 bg-white"}`}>
                    <span className="text-sm font-semibold text-gray-800">{r.label}</span>
                    {incomeRange === r.value && <Check className="w-4 h-4" style={{ color: GREEN }} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Dependants (people you support)</label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setDependants(n)}
                    style={dependants === n ? { backgroundColor: GREEN, color: "#fff" } : {}}
                    className={`w-10 h-10 rounded-full font-bold text-sm transition-all ${dependants === n ? "" : "bg-gray-100 text-gray-700"}`}>
                    {n === 5 ? "5+" : n}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <BigBtn onClick={nextStep}>Next <ArrowRight className="w-5 h-5" /></BigBtn>
          </div>
        )}

        {/* ── Step 2: Challenges ──────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">What's tough for you?</h1>
              <p className="text-gray-400 text-sm mt-1">Pick all that apply — Finora will focus here first.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {CHALLENGES.map(c => {
                const active = challenges.includes(c);
                return (
                  <button key={c} onClick={() => toggleChallenge(c)}
                    style={active ? { borderColor: GREEN, backgroundColor: "#f0fdf4" } : {}}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${active ? "" : "border-gray-100 bg-white"}`}>
                    <div style={active ? { backgroundColor: GREEN } : {}}
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${active ? "border-transparent" : "border-gray-300"}`}>
                      {active && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="text-[13px] font-semibold text-gray-800">{c}</span>
                  </button>
                );
              })}
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <BigBtn onClick={handleSubmit} disabled={createUser.isPending}>
              {createUser.isPending ? "Setting up your profile…" : <>Let's go! <ArrowRight className="w-5 h-5" /></>}
            </BigBtn>

            <p className="text-center text-xs text-gray-400">You can always update these later in your profile.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── sub-components ──────────────────────────────────────────────── */
function Field({
  label, value, onChange, placeholder, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-white text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-green-400 transition-colors"
      />
    </div>
  );
}

function BigBtn({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ backgroundColor: disabled ? undefined : GREEN }}
      className="w-full disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-[15px] active:scale-[0.98] transition-transform"
    >
      {children}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
