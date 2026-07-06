import { Router } from "express";
import { db } from "@workspace/db";
import { payments } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const MPESA_ENV = process.env.MPESA_ENV || "sandbox";
const BASE_URL =
  MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const SHORTCODE = process.env.MPESA_SHORTCODE || "174379";
const PASSKEY = process.env.MPESA_PASSKEY;

// ── Token cache (Daraja tokens expire in ~1 hour) ────────────────────────────
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error("M-Pesa credentials not configured");
  }
  const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) throw new Error(`Daraja token error: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: string };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (parseInt(data.expires_in) - 60) * 1000,
  };
  return cachedToken.token;
}

/** Timestamp in YYYYMMDDHHmmss format required by Daraja */
function getDarajaTimestamp(): string {
  return new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
}

/** base64(shortcode + passkey + timestamp) */
function getDarajaPassword(timestamp: string): string {
  return Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");
}

/**
 * Query Daraja's STK Push status API — the authoritative source for whether
 * a transaction succeeded. Never trust webhook payloads alone.
 */
async function queryDarajaStatus(checkoutRequestId: string): Promise<{
  resultCode: string;
  resultDesc: string;
}> {
  const token = await getAccessToken();
  const timestamp = getDarajaTimestamp();
  const password = getDarajaPassword(timestamp);

  const res = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });

  if (!res.ok) throw new Error(`STK query HTTP error: ${res.status}`);
  const data = (await res.json()) as {
    ResultCode?: string;
    ResultDesc?: string;
    errorCode?: string;
    errorMessage?: string;
  };

  // If Daraja returns an error code (e.g. transaction still processing), propagate it
  if (data.errorCode) throw new Error(data.errorMessage ?? `Daraja query error ${data.errorCode}`);

  return {
    resultCode: String(data.ResultCode ?? "1"),
    resultDesc: data.ResultDesc ?? "Unknown",
  };
}

/** Normalize Kenyan phone numbers to 254XXXXXXXXX */
function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-\+]/g, "");
  if (/^0[17]\d{8}$/.test(cleaned)) return `254${cleaned.slice(1)}`;
  if (/^254\d{9}$/.test(cleaned)) return cleaned;
  if (/^[17]\d{8}$/.test(cleaned)) return `254${cleaned}`;
  return cleaned;
}

const DURATIONS: Record<string, { amount: number; label: string }> = {
  daily: { amount: 10, label: "Finora Pro — 1 day" },
  weekly: { amount: 50, label: "Finora Pro — 7 days" },
  monthly: { amount: 199, label: "Finora Pro — 30 days" },
};

// ── POST /api/mpesa/stk-push ──────────────────────────────────────────────────
router.post("/stk-push", async (req, res) => {
  const { phone, duration } = req.body as { phone?: string; duration?: string };

  if (!phone || !duration || !DURATIONS[duration]) {
    res.status(400).json({ error: "phone and valid duration (daily/weekly/monthly) are required" });
    return;
  }

  const normalizedPhone = normalizePhone(phone);
  if (!/^254\d{9}$/.test(normalizedPhone)) {
    res.status(400).json({ error: "Invalid phone number. Use format 07XXXXXXXX or 254XXXXXXXXX." });
    return;
  }

  if (!PASSKEY || !CONSUMER_KEY || !CONSUMER_SECRET) {
    res.status(503).json({ error: "M-Pesa payments are not yet configured." });
    return;
  }

  const { amount, label } = DURATIONS[duration];

  try {
    const token = await getAccessToken();
    const timestamp = getDarajaTimestamp();
    const password = getDarajaPassword(timestamp);

    const callbackUrl =
      process.env.MPESA_CALLBACK_URL ||
      `https://${process.env.REPLIT_DEV_DOMAIN}/api/mpesa/callback`;

    const stkRes = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: normalizedPhone,
        PartyB: SHORTCODE,
        PhoneNumber: normalizedPhone,
        CallBackURL: callbackUrl,
        AccountReference: "Finora",
        TransactionDesc: label,
      }),
    });

    const stkData = (await stkRes.json()) as {
      CheckoutRequestID?: string;
      MerchantRequestID?: string;
      ResponseCode?: string;
      ResponseDescription?: string;
      CustomerMessage?: string;
      errorMessage?: string;
      errorCode?: string;
    };

    if (!stkRes.ok || stkData.ResponseCode !== "0") {
      req.log.error({ stkData }, "STK push rejected by Daraja");
      res.status(502).json({
        error: stkData.errorMessage || stkData.ResponseDescription || "Payment request failed",
      });
      return;
    }

    const [payment] = await db
      .insert(payments)
      .values({
        phone: normalizedPhone,
        amount,
        duration,
        checkoutRequestId: stkData.CheckoutRequestID!,
        merchantRequestId: stkData.MerchantRequestID ?? null,
        status: "pending",
      })
      .returning();

    res.json({
      checkoutRequestId: payment.checkoutRequestId,
      message: stkData.CustomerMessage || "Check your phone and enter your M-Pesa PIN.",
    });
  } catch (err) {
    req.log.error({ err }, "M-Pesa STK push error");
    res.status(500).json({ error: "Payment request failed. Please try again." });
  }
});

// ── POST /api/mpesa/callback (Safaricom webhook) ──────────────────────────────
// IMPORTANT: Daraja does not provide request signing. To prevent spoofed
// callbacks from granting PRO access, we NEVER mark a payment 'completed'
// based solely on what the callback body claims. Instead, on any completion
// signal (ResultCode 0 in the callback), we call back to Daraja's STK Query
// API to independently verify the outcome. Only the verified Daraja response
// updates the payment status. Non-zero ResultCodes (failure/cancellation) are
// accepted from the callback body since they cannot grant Pro access.
router.post("/callback", async (req, res) => {
  // Acknowledge immediately — Safaricom retries if they don't get a quick 200
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });

  const callback = req.body?.Body?.stkCallback;
  if (!callback) return;

  const checkoutRequestId: string = callback.CheckoutRequestID;
  if (!checkoutRequestId) return;

  // Look up the payment we initiated — only process known checkout IDs
  const [existing] = await db
    .select()
    .from(payments)
    .where(eq(payments.checkoutRequestId, checkoutRequestId));

  if (!existing || existing.status !== "pending") return;

  const callbackResultCode = String(callback.ResultCode);

  if (callbackResultCode !== "0") {
    // Non-success result: safe to trust (cannot be used to forge Pro access)
    const status = callbackResultCode === "1032" ? "cancelled" : "failed";
    await db
      .update(payments)
      .set({ status, resultCode: callbackResultCode, resultDesc: String(callback.ResultDesc ?? "") })
      .where(eq(payments.checkoutRequestId, checkoutRequestId));
    return;
  }

  // Claimed success — verify with Daraja before marking completed
  try {
    const verified = await queryDarajaStatus(checkoutRequestId);
    if (verified.resultCode !== "0") {
      // Daraja says it didn't succeed — reject the spoofed / premature callback
      await db
        .update(payments)
        .set({ status: "failed", resultCode: verified.resultCode, resultDesc: verified.resultDesc })
        .where(eq(payments.checkoutRequestId, checkoutRequestId));
      return;
    }

    // Extract receipt from callback metadata (for display only — status comes from query)
    let mpesaReceipt: string | null = null;
    if (callback.CallbackMetadata?.Item) {
      const item = (callback.CallbackMetadata.Item as Array<{ Name: string; Value?: string }>).find(
        (i) => i.Name === "MpesaReceiptNumber"
      );
      mpesaReceipt = item?.Value ?? null;
    }

    await db
      .update(payments)
      .set({ status: "completed", resultCode: "0", resultDesc: verified.resultDesc, mpesaReceipt })
      .where(eq(payments.checkoutRequestId, checkoutRequestId));
  } catch (err) {
    // If we can't reach Daraja to verify, leave status as 'pending' so the
    // polling endpoint can retry the query later
    console.error("Daraja verification failed in callback:", err);
  }
});

// ── GET /api/mpesa/status/:checkoutRequestId ──────────────────────────────────
// The frontend polls this. If the payment is still 'pending' we proactively
// query Daraja so the user doesn't have to wait for the callback round-trip.
router.get("/status/:checkoutRequestId", async (req, res) => {
  const { checkoutRequestId } = req.params;

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.checkoutRequestId, checkoutRequestId));

  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  // If still pending and credentials are available, query Daraja for fresh status
  if (payment.status === "pending" && PASSKEY && CONSUMER_KEY && CONSUMER_SECRET) {
    try {
      const verified = await queryDarajaStatus(checkoutRequestId);
      if (verified.resultCode === "0") {
        await db
          .update(payments)
          .set({ status: "completed", resultCode: "0", resultDesc: verified.resultDesc })
          .where(eq(payments.checkoutRequestId, checkoutRequestId));
        res.json({ status: "completed", amount: payment.amount, duration: payment.duration });
        return;
      } else if (verified.resultCode !== "0" && verified.resultCode !== "1037") {
        // 1037 = transaction still in process — don't mark failed yet
        const status = verified.resultCode === "1032" ? "cancelled" : "failed";
        await db
          .update(payments)
          .set({ status, resultCode: verified.resultCode, resultDesc: verified.resultDesc })
          .where(eq(payments.checkoutRequestId, checkoutRequestId));
        res.json({ status, amount: payment.amount, duration: payment.duration });
        return;
      }
    } catch {
      // Daraja query failed (e.g. still processing) — return current DB status
    }
  }

  res.json({
    status: payment.status,
    amount: payment.amount,
    duration: payment.duration,
    mpesaReceipt: payment.mpesaReceipt,
  });
});

export default router;
