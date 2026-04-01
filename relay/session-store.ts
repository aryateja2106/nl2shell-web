import Database from "better-sqlite3";
import { mkdirSync, existsSync } from "node:fs";

const DATA_DIR = "./data";
const DB_PATH = `${DATA_DIR}/sessions.db`;

export interface Session {
  id: string;
  container_name: string;
  volume_name: string;
  created_at: number;
  last_active: number;
  status: string;
}

function openDb(): Database.Database {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  const db = new Database(DB_PATH);

  // WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      container_name TEXT NOT NULL,
      volume_name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_active INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'running'
    )
  `);

  return db;
}

// Singleton connection — opened once and reused
let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) _db = openDb();
  return _db;
}

export function createSession(
  id: string,
  containerName: string,
  volumeName: string
): Session {
  const db = getDb();
  const now = Date.now();
  const session: Session = {
    id,
    container_name: containerName,
    volume_name: volumeName,
    created_at: now,
    last_active: now,
    status: "running",
  };
  db.prepare(
    `INSERT INTO sessions (id, container_name, volume_name, created_at, last_active, status)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    session.id,
    session.container_name,
    session.volume_name,
    session.created_at,
    session.last_active,
    session.status
  );
  return session;
}

export function getSession(id: string): Session | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM sessions WHERE id = ?")
    .get(id) as Session | undefined;
  return row ?? null;
}

export function listSessions(): Session[] {
  const db = getDb();
  return db.prepare("SELECT * FROM sessions ORDER BY created_at DESC").all() as Session[];
}

export function updateLastActive(id: string): void {
  const db = getDb();
  db.prepare("UPDATE sessions SET last_active = ? WHERE id = ?").run(
    Date.now(),
    id
  );
}

export function updateStatus(id: string, status: string): void {
  const db = getDb();
  db.prepare("UPDATE sessions SET status = ? WHERE id = ?").run(status, id);
}

export function deleteSession(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

export function getExpiredSessions(maxAgeMs = 86_400_000): Session[] {
  const db = getDb();
  const cutoff = Date.now() - maxAgeMs;
  return db
    .prepare("SELECT * FROM sessions WHERE last_active < ?")
    .all(cutoff) as Session[];
}

export function cleanupExpired(maxAgeMs = 86_400_000): void {
  const db = getDb();
  const cutoff = Date.now() - maxAgeMs;
  db.prepare("DELETE FROM sessions WHERE last_active < ?").run(cutoff);
}
