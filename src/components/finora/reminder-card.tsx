import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, Check, Clock, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getIncompleteTransactions,
  completeTransaction,
  snoozeTransactionPrompt,
  dismissTransactionPrompt,
} from "@/lib/reminders.functions";
import { suggestTransactionValues } from "@/lib/suggest.functions";

const CATEGORIES = [
  "Food",
  "Transport",
  "Bills",
  "Airtime/Data",
  "Shopping",
  "Family",
  "Health",
  "Rent",
  "Savings",
  "Debt repayment",
  "Salary",
  "Side hustle",
  "Other",
];

const kes = (n: number | string | null | undefined) => {
  const v = n == null ? 0 : Number(n);
  return `KES ${v.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
};

export function ReminderCard() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getIncompleteTransactions);
  const completeFn = useServerFn(completeTransaction);
  const snoozeFn = useServerFn(snoozeTransactionPrompt);
  const dismissFn = useServerFn(dismissTransactionPrompt);

  const { data } = useQuery({
    queryKey: ["incomplete-transactions"],
    queryFn: () => fetchFn(),
    // Re-check every 5 minutes so dueAgain flips automatically.
    refetchInterval: 5 * 60 * 1000,
  });

  const due = data?.due ?? [];
  const total = data?.items.length ?? 0;

  // Show a soft toast the first time per session that new prompts surface.
  const [toasted, setToasted] = useState(false);
  useEffect(() => {
    if (!toasted && due.length > 0) {
      toast(
        due.length === 1
          ? "1 transaction needs a quick detail."
          : `${due.length} transactions need quick details.`,
        { description: "Add a category or note so your coach learns faster." },
      );
      setToasted(true);
    }
  }, [due.length, toasted]);

  const complete = useMutation({
    mutationFn: (v: { id: string; category?: string; note?: string }) =>
      completeFn({ data: v }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["incomplete-transactions"] });
      qc.invalidateQueries({ queryKey: ["snapshot"] });
      if (r.resolved) toast.success("Saved. Nice — one less thing.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const snooze = useMutation({
    mutationFn: (id: string) => snoozeFn({ data: { id } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["incomplete-transactions"] }),
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => dismissFn({ data: { id } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["incomplete-transactions"] }),
  });

  if (due.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="rounded-2xl border border-warning/40 bg-warning/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning-foreground">
            <BellRing className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-semibold">
              Quick reminder
            </h3>
            <p className="text-sm text-muted-foreground">
              {due.length === total
                ? `You have ${due.length} transaction${due.length === 1 ? "" : "s"} missing details.`
                : `${due.length} of ${total} need attention now — we'll bring the rest back later.`}{" "}
              Adding a category or note now means your coach gets the picture right.
            </p>
          </div>
        </div>

        <ul className="mt-4 space-y-3">
          {due.slice(0, 5).map((t) => (
            <ReminderRow
              key={t.id}
              tx={t}
              busy={complete.isPending || snooze.isPending || dismiss.isPending}
              onSave={(v) => complete.mutate({ id: t.id, ...v })}
              onLater={() => snooze.mutate(t.id)}
              onDismiss={() => dismiss.mutate(t.id)}
            />
          ))}
        </ul>
        {due.length > 5 && (
          <p className="mt-3 text-xs text-muted-foreground">
            +{due.length - 5} more — we'll show them after these.
          </p>
        )}
      </div>
    </section>
  );
}

type Tx = {
  id: string;
  amount_kes: number;
  type: string;
  category: string | null;
  note: string | null;
  transaction_date: string;
  counterparty: string | null;
  mpesa_code: string | null;
  prompt_snooze_count: number;
  missing: ("category" | "note")[];
};

function ReminderRow({
  tx,
  busy,
  onSave,
  onLater,
  onDismiss,
}: {
  tx: Tx;
  busy: boolean;
  onSave: (v: { category?: string; note?: string }) => void;
  onLater: () => void;
  onDismiss: () => void;
}) {
  const needsCat = tx.missing.includes("category");
  const needsNote = tx.missing.includes("note");
  const [cat, setCat] = useState(tx.category ?? "");
  const [note, setNote] = useState(tx.note ?? "");

  const title = useMemo(() => {
    if (tx.counterparty) return tx.counterparty;
    if (tx.note) return tx.note;
    return tx.type === "income" ? "Money in" : "Money out";
  }, [tx]);

  const canSave =
    (needsCat ? cat.trim().length > 0 : true) &&
    (needsNote ? note.trim().length > 0 : true) &&
    (needsCat || needsNote);

  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">
            {tx.transaction_date} · {tx.type === "expense" ? "-" : "+"}
            {kes(tx.amount_kes)}
            {tx.mpesa_code ? ` · ${tx.mpesa_code}` : ""}
            {tx.prompt_snooze_count > 0
              ? ` · asked ${tx.prompt_snooze_count}× before`
              : ""}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {needsCat && (
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Pick a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {needsNote && (
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What was this for?"
            maxLength={200}
            className="h-9"
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          disabled={busy}
          title="Don't ask again about this one"
        >
          <X className="h-3.5 w-3.5" /> Skip
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLater}
          disabled={busy}
          title="Remind me later"
        >
          <Clock className="h-3.5 w-3.5" /> Later
        </Button>
        <Button
          size="sm"
          disabled={!canSave || busy}
          onClick={() =>
            onSave({
              category: needsCat && cat.trim() ? cat.trim() : undefined,
              note: needsNote && note.trim() ? note.trim() : undefined,
            })
          }
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Save
        </Button>
      </div>
    </li>
  );
}
