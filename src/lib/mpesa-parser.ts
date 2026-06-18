// M-Pesa SMS parser. Pure function, runs on server or client.
// Handles the common Safaricom confirmation formats: sent, received, paid,
// withdrawn, airtime, deposit, paybill, till.

export type ParsedMpesa = {
  mpesa_code: string;
  type: "income" | "expense";
  amount_kes: number;
  category: string | null;
  counterparty: string | null;
  counterparty_phone: string | null;
  balance_kes: number | null;
  transaction_date: string; // YYYY-MM-DD
  note: string;
};

const AMOUNT = /Ksh([\d,]+(?:\.\d+)?)/i;
const CODE = /^([A-Z0-9]{10})\b/;
const BALANCE = /(?:M-?PESA balance is|new M-?PESA balance is)\s*Ksh([\d,]+(?:\.\d+)?)/i;
const DATE = /on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i;
const PHONE = /(\+?254\d{9}|0?7\d{8}|0?1\d{8})/;

function num(s: string | undefined | null): number {
  if (!s) return 0;
  return Math.round(parseFloat(s.replace(/,/g, "")));
}

function toIsoDate(d: string | undefined): string {
  if (!d) return new Date().toISOString().slice(0, 10);
  const [dd, mm, yy] = d.split("/");
  const year = yy.length === 2 ? `20${yy}` : yy;
  return `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

export function parseMpesaSms(raw: string): ParsedMpesa | null {
  if (!raw) return null;
  const text = raw.trim().replace(/\s+/g, " ");

  const code = text.match(CODE)?.[1];
  if (!code) return null;
  const amount = num(text.match(AMOUNT)?.[1]);
  if (!amount) return null;
  const balance = num(text.match(BALANCE)?.[1]) || null;
  const transaction_date = toIsoDate(text.match(DATE)?.[1]);
  const phone = text.match(PHONE)?.[1] ?? null;

  const lower = text.toLowerCase();
  let type: "income" | "expense" = "expense";
  let category: string | null = null;
  let counterparty: string | null = null;

  // Received from / deposit
  if (/you have received/i.test(text)) {
    type = "income";
    category = "transfer in";
    counterparty = text.match(/received Ksh[\d,.]+ from ([A-Z0-9 .'-]+?)(?:\s+\d|\s+on\b)/i)?.[1]?.trim() ?? null;
  } else if (/^.*?confirmed\.?\s*you have received/i.test(text) || /deposit of/i.test(text)) {
    type = "income";
    category = "deposit";
  } else if (/sent to/i.test(text)) {
    type = "expense";
    category = "send money";
    counterparty = text.match(/sent to ([A-Z0-9 .'-]+?)(?: \d| for| on)/i)?.[1]?.trim() ?? null;
  } else if (/paid to/i.test(text)) {
    type = "expense";
    category = "till/paybill";
    counterparty = text.match(/paid to ([A-Z0-9 .'&-]+?)(?:\.|\s+on\b)/i)?.[1]?.trim() ?? null;
  } else if (/withdraw/i.test(text)) {
    type = "expense";
    category = "withdrawal";
    counterparty = text.match(/from ([A-Z0-9 .'-]+? agent|.+? ATM)/i)?.[1]?.trim() ?? null;
  } else if (/airtime/i.test(text)) {
    type = "expense";
    category = "airtime";
  } else if (/bought.*for ksh/i.test(lower)) {
    type = "expense";
    category = "purchase";
  }

  return {
    mpesa_code: code,
    type,
    amount_kes: amount,
    category,
    counterparty,
    counterparty_phone: phone,
    balance_kes: balance,
    transaction_date,
    note: counterparty ? `${category ?? "M-Pesa"} • ${counterparty}` : (category ?? "M-Pesa"),
  };
}
