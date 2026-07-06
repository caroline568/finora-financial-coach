import { useState, useEffect, useRef } from "react";
import { X, Phone, Loader2, CheckCircle2, AlertCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type Stage = "input" | "pending" | "success" | "error";

type Duration = "daily" | "weekly" | "monthly";

interface Props {
  open: boolean;
  duration: Duration;
  amount: number;
  onClose: () => void;
  onPaid: (checkoutRequestId: string) => void;
}

const DURATION_LABELS: Record<Duration, string> = {
  daily: "1 day",
  weekly: "7 days",
  monthly: "30 days",
};

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90_000;

export function MpesaModal({ open, duration, amount, onClose, onPaid }: Props) {
  const [stage, setStage] = useState<Stage>("input");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [checkoutId, setCheckoutId] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when re-opened
  useEffect(() => {
    if (open) {
      setStage("input");
      setPhone("");
      setPhoneError("");
      setStatusMessage("");
      setErrorMessage("");
      setCheckoutId("");
    }
    return () => stopPolling();
  }, [open]);

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollRef.current = null;
    timeoutRef.current = null;
  }

  function validatePhone(value: string): string {
    const cleaned = value.replace(/[\s\-\+]/g, "");
    if (!cleaned) return "Please enter your Safaricom number.";
    if (!/^(07|01|254[17])\d/.test(cleaned)) return "Use a Safaricom number (07XX or 01XX).";
    const digits = cleaned.startsWith("254") ? cleaned.slice(3) : cleaned.slice(1);
    if (digits.length !== 9) return "Number should be 10 digits (e.g. 0712 345 678).";
    return "";
  }

  async function handleSubmit() {
    const err = validatePhone(phone);
    if (err) { setPhoneError(err); return; }
    setPhoneError("");
    setStage("pending");
    setStatusMessage("Sending payment request…");

    try {
      const res = await fetch("/api/mpesa/stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, duration }),
      });
      const data = await res.json() as { checkoutRequestId?: string; message?: string; error?: string };

      if (!res.ok || !data.checkoutRequestId) {
        setStage("error");
        setErrorMessage(data.error || "Payment request failed. Try again.");
        return;
      }

      setCheckoutId(data.checkoutRequestId);
      setStatusMessage(data.message || "Check your phone — enter your M-Pesa PIN.");
      startPolling(data.checkoutRequestId);
    } catch {
      setStage("error");
      setErrorMessage("Network error. Check your connection and try again.");
    }
  }

  function startPolling(cid: string) {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/mpesa/status/${cid}`);
        const data = await res.json() as { status?: string };
        if (data.status === "completed") {
          stopPolling();
          setStage("success");
          setTimeout(() => onPaid(cid), 1200);
        } else if (data.status === "failed") {
          stopPolling();
          setStage("error");
          setErrorMessage("Payment was not completed. Please try again.");
        } else if (data.status === "cancelled") {
          stopPolling();
          setStage("error");
          setErrorMessage("You cancelled the M-Pesa prompt. Tap below to try again.");
        }
      } catch { /* ignore poll errors */ }
    }, POLL_INTERVAL_MS);

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      if (stage !== "success") {
        setStage("error");
        setErrorMessage("Payment timed out. If you entered your PIN, wait a moment and try starting again.");
      }
    }, POLL_TIMEOUT_MS);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={stage === "input" || stage === "error" ? onClose : undefined}
      />

      {/* Sheet */}
      <div className="relative z-10 w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

        {/* Top handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#4CAF50]/15 rounded-xl flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-[#4CAF50]" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Pay with M-Pesa</p>
              <p className="text-xs text-muted-foreground">
                KSh {amount} · {DURATION_LABELS[duration]}
              </p>
            </div>
          </div>
          {(stage === "input" || stage === "error") && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">

          {/* INPUT STAGE */}
          {stage === "input" && (
            <>
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 space-y-1">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                  As easy as buying airtime
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enter your Safaricom number and we'll send an M-Pesa PIN prompt straight to your phone.
                  No app download, no card needed.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="mpesa-phone">
                  Your Safaricom number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="mpesa-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="0712 345 678"
                    autoFocus
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-card text-foreground text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/30 ${
                      phoneError ? "border-red-400 focus:ring-red-300" : "border-border focus:border-primary"
                    }`}
                  />
                </div>
                {phoneError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {phoneError}
                  </p>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full h-12 rounded-xl font-semibold bg-[#4CAF50] hover:bg-[#43A047] text-white text-base"
              >
                Send M-Pesa Request · KSh {amount}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                You'll see a PIN prompt on your phone within seconds.
              </p>
            </>
          )}

          {/* PENDING STAGE */}
          {stage === "pending" && (
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-foreground">Check your phone</p>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                  {statusMessage || "A pop-up will appear on your Safaricom phone. Enter your M-Pesa PIN to complete the payment."}
                </p>
              </div>
              <div className="w-full bg-secondary/60 rounded-xl px-5 py-3 text-xs text-muted-foreground text-center">
                Don't see the prompt? Make sure your number is correct and you have sufficient M-Pesa balance.
              </div>
            </div>
          )}

          {/* SUCCESS STAGE */}
          {stage === "success" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-16 h-16 bg-[#4CAF50]/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-[#4CAF50]" />
              </div>
              <div className="space-y-1.5">
                <p className="font-semibold text-foreground">Payment received!</p>
                <p className="text-sm text-muted-foreground">
                  KSh {amount} confirmed. Opening your Pro session…
                </p>
              </div>
            </div>
          )}

          {/* ERROR STAGE */}
          {stage === "error" && (
            <>
              <div className="flex flex-col items-center gap-4 py-2 text-center">
                <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-red-500" />
                </div>
                <div className="space-y-1.5">
                  <p className="font-semibold text-foreground">Payment not completed</p>
                  <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{errorMessage}</p>
                </div>
              </div>
              <Button
                onClick={() => setStage("input")}
                className="w-full h-12 rounded-xl font-semibold"
                variant="outline"
              >
                Try again
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
