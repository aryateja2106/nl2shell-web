import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Returns Supabase client if configured, null otherwise.
 * Graceful degradation: app works fine without Supabase (feedback goes to logs only).
 */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  client = createClient(url, key);
  return client;
}

// ── Feedback persistence ──

export interface FeedbackRow {
  query: string;
  command: string;
  rating: "up" | "down";
  correction?: string;
  ip: string;
}

export async function saveFeedback(row: FeedbackRow): Promise<boolean> {
  const db = getSupabase();
  if (!db) return false;

  const { error } = await db.from("feedback").insert({
    query: row.query,
    command: row.command,
    rating: row.rating,
    correction: row.correction || null,
    ip_hash: await hashIp(row.ip),
  });

  return !error;
}

// ── Translation logging (for analytics) ──

export interface TranslationRow {
  query: string;
  command: string;
  duration_ms: number;
  ip: string;
}

export async function saveTranslation(row: TranslationRow): Promise<boolean> {
  const db = getSupabase();
  if (!db) return false;

  const { error } = await db.from("translations").insert({
    query: row.query,
    command: row.command,
    duration_ms: row.duration_ms,
    ip_hash: await hashIp(row.ip),
  });

  return !error;
}

// ── IP hashing (privacy-preserving) ──

async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = process.env.IP_SALT || crypto.randomUUID();
  const data = encoder.encode(ip + salt);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
