import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import { submitFeedback } from "@/lib/feedback.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const send = useServerFn(submitFeedback);
  const page = useRouterState({ select: (s) => s.location.pathname });
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [category, setCategory] = useState<
    "general" | "bug" | "idea" | "concern" | "praise"
  >("general");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setRating(0);
    setHover(0);
    setCategory("general");
    setMessage("");
  }

  async function handleSubmit() {
    if (rating < 1) {
      toast.error("Pick a rating from 1 to 5 stars.");
      return;
    }
    const trimmed = message.trim();
    if (trimmed.length < 1) {
      toast.error("Add a short note so we know what to look at.");
      return;
    }
    if (trimmed.length > 2000) {
      toast.error("Please keep it under 2000 characters.");
      return;
    }
    setBusy(true);
    try {
      await send({
        data: { rating, category, message: trimmed, page },
      });
      toast.success("Asante! Your feedback is in — we read every word.");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send feedback");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Send feedback</DialogTitle>
          <DialogDescription>
            Tell us what's working, what's broken, or what would make Finora
            more useful for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <Label className="text-sm">How's the app feeling?</Label>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (hover || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(n)}
                    className="rounded-md p-1 transition-transform hover:scale-110"
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  >
                    <Star
                      className={cn(
                        "h-7 w-7 transition-colors",
                        active
                          ? "fill-accent text-accent"
                          : "text-muted-foreground/40",
                      )}
                    />
                  </button>
                );
              })}
              {rating > 0 && (
                <span className="ml-2 self-center text-sm text-muted-foreground">
                  {["", "Rough", "Meh", "Okay", "Good", "Love it"][rating]}
                </span>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="fb-category" className="text-sm">
              What's this about?
            </Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as typeof category)}
            >
              <SelectTrigger id="fb-category" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General feedback</SelectItem>
                <SelectItem value="bug">Something's broken</SelectItem>
                <SelectItem value="idea">An idea / feature request</SelectItem>
                <SelectItem value="concern">A concern or worry</SelectItem>
                <SelectItem value="praise">Praise / what you love</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="fb-message" className="text-sm">
              Your message
            </Label>
            <Textarea
              id="fb-message"
              placeholder="What happened, what you'd love to see, or what felt off..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={5}
              className="mt-2"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {message.length}/2000
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Send feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
