import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const API = `${BASE}/api`;

export type FinoraUser = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  occupation: string | null;
  incomeType: string | null;
  incomeRange: string | null;
  payFrequency: string | null;
  dependants: number;
  financialPersonality: string | null;
  financialChallenges: string | null; // JSON string[]
  healthScore: number;
  onboardingComplete: number;
  authProvider: string;
  avatarUrl: string | null;
  createdAt: string;
};

export type Goal = {
  id: number;
  userId: number;
  title: string;
  emoji: string | null;
  category: string | null;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  status: string;
  createdAt: string;
};

export type Transaction = {
  id: number;
  userId: number;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string | null;
  date: string;
};

export type AiMemoryEntry = {
  id: number;
  userId: number;
  memoryType: string;
  content: string;
  metadata: string | null;
  createdAt: string;
};

export type DashboardSummary = {
  monthlyIncome: number;
  monthlyExpenses: number;
  net: number;
  expensesByCategory: Record<string, number>;
  activeGoalCount: number;
  streaks: Array<{ habitType: string; currentStreak: number; longestStreak: number; lastCheckIn: string | null }>;
};

/* ── localStorage helpers ─────────────────────────────────────────── */
export function getStoredUserId(): number | null {
  const val = localStorage.getItem("finora_user_id");
  const num = val ? parseInt(val, 10) : NaN;
  return isNaN(num) ? null : num;
}

export function setStoredUserId(id: number) {
  localStorage.setItem("finora_user_id", String(id));
}

export function clearStoredUser() {
  localStorage.removeItem("finora_user_id");
}

/* ── fetch helpers ────────────────────────────────────────────────── */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

/* ── hooks ────────────────────────────────────────────────────────── */
export function useCurrentUser() {
  const userId = getStoredUserId();
  return useQuery<FinoraUser>({
    queryKey: ["user", userId],
    queryFn: () => apiFetch<FinoraUser>(`/users/${userId}`),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FinoraUser>) =>
      apiFetch<FinoraUser>("/users", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (user) => {
      setStoredUserId(user.id);
      qc.setQueryData(["user", user.id], user);
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  const userId = getStoredUserId();
  return useMutation({
    mutationFn: (data: Partial<FinoraUser>) =>
      apiFetch<FinoraUser>(`/users/${userId}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (user) => {
      qc.setQueryData(["user", userId], user);
    },
  });
}

export function useGoals() {
  const userId = getStoredUserId();
  return useQuery<Goal[]>({
    queryKey: ["goals", userId],
    queryFn: () => apiFetch<Goal[]>(`/users/${userId}/goals`),
    enabled: !!userId,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  const userId = getStoredUserId();
  return useMutation({
    mutationFn: (data: Partial<Goal>) =>
      apiFetch<Goal>(`/users/${userId}/goals`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", userId] }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  const userId = getStoredUserId();
  return useMutation({
    mutationFn: ({ goalId, ...data }: Partial<Goal> & { goalId: number }) =>
      apiFetch<Goal>(`/users/${userId}/goals/${goalId}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", userId] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  const userId = getStoredUserId();
  return useMutation({
    mutationFn: (goalId: number) =>
      fetch(`${API}/users/${userId}/goals/${goalId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", userId] }),
  });
}

export function useTransactions(limit = 50) {
  const userId = getStoredUserId();
  return useQuery<Transaction[]>({
    queryKey: ["transactions", userId, limit],
    queryFn: () => apiFetch<Transaction[]>(`/users/${userId}/transactions?limit=${limit}`),
    enabled: !!userId,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  const userId = getStoredUserId();
  return useMutation({
    mutationFn: (data: Partial<Transaction>) =>
      apiFetch<Transaction>(`/users/${userId}/transactions`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions", userId] });
      qc.invalidateQueries({ queryKey: ["summary", userId] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  const userId = getStoredUserId();
  return useMutation({
    mutationFn: (txId: number) =>
      fetch(`${API}/users/${userId}/transactions/${txId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions", userId] });
      qc.invalidateQueries({ queryKey: ["summary", userId] });
    },
  });
}

export function useDashboardSummary() {
  const userId = getStoredUserId();
  return useQuery<DashboardSummary>({
    queryKey: ["summary", userId],
    queryFn: () => apiFetch<DashboardSummary>(`/users/${userId}/summary`),
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
}

export function useAiMemory(limit = 20) {
  const userId = getStoredUserId();
  return useQuery<AiMemoryEntry[]>({
    queryKey: ["ai-memory", userId],
    queryFn: () => apiFetch<AiMemoryEntry[]>(`/users/${userId}/ai-memory?limit=${limit}`),
    enabled: !!userId,
  });
}

export function formatKES(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

export const OCCUPATIONS = [
  { value: "conductor",     label: "Conductor 🚌",       desc: "Matatu / bus conductor" },
  { value: "mama-mboga",   label: "Mama Mboga 🥬",      desc: "Vegetable / market seller" },
  { value: "boda-rider",   label: "Boda Rider 🏍️",      desc: "Motorcycle taxi rider" },
  { value: "student",      label: "Student 🎓",          desc: "University / college" },
  { value: "biashara",     label: "Small Business 🏪",   desc: "Shop / enterprise owner" },
  { value: "office-worker",label: "Office Worker 💼",    desc: "Employed professional" },
  { value: "casual-worker",label: "Casual Worker 🏗️",   desc: "Jua kali / daily work" },
  { value: "other",        label: "Other 👤",            desc: "Something else" },
];

export const INCOME_RANGES = [
  { value: "under-10k",  label: "Under KSh 10,000" },
  { value: "10k-25k",   label: "KSh 10,000 – 25,000" },
  { value: "25k-50k",   label: "KSh 25,000 – 50,000" },
  { value: "50k-100k",  label: "KSh 50,000 – 100,000" },
  { value: "over-100k", label: "Over KSh 100,000" },
];

export const CHALLENGES = [
  "Saving consistently",
  "Managing debt",
  "Irregular income",
  "Family expenses",
  "Impulse spending",
  "No emergency fund",
  "Business cash flow",
  "Rent / housing",
];
