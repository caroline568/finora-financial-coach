import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Smartphone, Copy, RefreshCcw, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  getIngestToken,
  rotateIngestToken,
  importMpesaSms,
} from "@/lib/mpesa.functions";

export function MpesaCard() {
  const qc = useQueryClient();
  const fetchToken = useServerFn(getIngestToken);
  const rotateFn = useServerFn(rotateIngestToken);
  const importFn = useServerFn(importMpesaSms);

  const { data, isLoading } = useQuery({
    queryKey: ["ingest-token"],
    queryFn: () => fetchToken(),
  });

  const [open, setOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const [endpointBase] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin,
  );

  const rotate = useMutation({
    mutationFn: () => rotateFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingest-token"] });
      toast.success("New token generated. Update your SMS forwarder.");
    },
  });

  const importPaste = useMutation({
    mutationFn: (text: string) => importFn({ data: { text } }),
    onSuccess: (r) => {
      toast.success(
        `Imported ${r.imported} · ${r.duplicates} already had · ${r.skipped} skipped`,
      );
      setPaste("");
      qc.invalidateQueries({ queryKey: ["snapshot"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const token = data?.token ?? "";
  const endpoint = `${endpointBase}/api/public/mpesa-sms`;
  const curl = `curl -X POST ${endpoint} \\
  -H "content-type: application/json" \\
  -d '{"token":"${token || "YOUR_TOKEN"}","sms":"<paste M-Pesa SMS here>"}'`;

  const copy = (s: string, label: string) => {
    navigator.clipboard?.writeText(s);
    toast.success(`${label} copied`);
  };

  return (
    <section className="mt-8">
      <div className="rounded-2xl border border-border bg-card p-5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-start gap-3 text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-semibold">
              Auto-import M-Pesa SMS
            </h3>
            <p className="text-sm text-muted-foreground">
              Stop typing every transaction. Forward your M-Pesa confirmation
              messages and Finora logs them for you.
            </p>
          </div>
          {open ? (
            <ChevronUp className="mt-2 h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="mt-2 h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {open && (
          <div className="mt-5 space-y-5 border-t border-border pt-5">
            {/* Paste path */}
            <div>
              <p className="mb-2 text-sm font-medium">Quickest: paste an SMS</p>
              <Textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder={
                  "Paste one or more M-Pesa confirmation messages here.\n\nExample:\nTGH5KL9P2A Confirmed. Ksh1,500.00 sent to JANE DOE 0712345678 on 18/6/26 at 2:14 PM. New M-PESA balance is Ksh3,420.00."
                }
                rows={5}
                className="text-xs"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  disabled={paste.trim().length < 20 || importPaste.isPending}
                  onClick={() => importPaste.mutate(paste)}
                >
                  {importPaste.isPending && (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  )}
                  Import
                </Button>
              </div>
            </div>

            {/* Auto-forward path */}
            <div className="rounded-xl bg-muted/40 p-4">
              <p className="text-sm font-medium">Auto-forward from your phone</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                <li>
                  Install a free SMS forwarder app (Android): <em>SMS Forwarder</em>,{" "}
                  <em>SMS to URL Forwarder</em>, or <em>Macrodroid</em>.
                </li>
                <li>
                  Add a rule: when SMS from <code>MPESA</code> arrives, POST JSON to
                  the endpoint below with your token and the message body as{" "}
                  <code>sms</code>.
                </li>
                <li>You'll see new transactions appear here automatically.</li>
              </ol>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field
                  label="Endpoint"
                  value={endpoint}
                  onCopy={() => copy(endpoint, "Endpoint")}
                />
                <Field
                  label="Your token (keep private)"
                  value={isLoading ? "loading…" : token || "—"}
                  mono
                  onCopy={() => token && copy(token, "Token")}
                  trailing={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Rotate token"
                      onClick={() => rotate.mutate()}
                      disabled={rotate.isPending}
                    >
                      <RefreshCcw
                        className={`h-3.5 w-3.5 ${rotate.isPending ? "animate-spin" : ""}`}
                      />
                    </Button>
                  }
                />
              </div>

              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Test from terminal
                </p>
                <pre className="overflow-x-auto rounded-lg bg-background p-3 text-[11px] leading-relaxed">
                  {curl}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1"
                  onClick={() => copy(curl, "cURL")}
                >
                  <Copy className="mr-1.5 h-3 w-3" />
                  Copy
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              We only store the parsed amount, M-Pesa code, counterparty and the
              raw message — nothing else from your phone. The token is the only
              key to your inbox; rotate it any time.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  mono,
  onCopy,
  trailing,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1.5">
        <span
          className={`flex-1 truncate text-xs ${mono ? "font-mono" : ""}`}
          title={value}
        >
          {value}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={onCopy} title="Copy">
          <Copy className="h-3.5 w-3.5" />
        </Button>
        {trailing}
      </div>
    </div>
  );
}
