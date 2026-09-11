import { DatabaseSync } from "node:sqlite";

export interface Project {
  id: number;
  cwd: string;
  displayName: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRecord {
  id: string;
  projectId: number;
  title: string;
  status: string;
  turnCount: number;
  modelId: string | null;
  origin: string;
  createdAt: string;
  updatedAt: string;
}

export interface TurnRecord {
  id: string;
  sessionId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function displayNameFor(cwd: string): string {
  const trimmed = cwd.replace(/[\\/]+$/, "");
  const parts = trimmed.split(/[\\/]/);
  return parts[parts.length - 1] || trimmed;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cwd TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL DEFAULT 'New session',
  status TEXT NOT NULL DEFAULT 'active',
  turn_count INTEGER NOT NULL DEFAULT 0,
  model_id TEXT,
  origin TEXT NOT NULL DEFAULT 'helicon',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS turns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  status TEXT NOT NULL DEFAULT 'running',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id);
`;

export class HeliconStore {
  private readonly db: DatabaseSync;

  constructor(path = ":memory:") {
    this.db = new DatabaseSync(path);
    this.db.exec(SCHEMA);
  }

  upsertProject(cwd: string): Project {
    const now = nowIso();
    this.db
      .prepare(
        `INSERT INTO projects (cwd, display_name, pinned, created_at, updated_at)
         VALUES (?, ?, 0, ?, ?)
         ON CONFLICT(cwd) DO UPDATE SET updated_at = excluded.updated_at`,
      )
      .run(cwd, displayNameFor(cwd), now, now);
    const row = this.db
      .prepare(`SELECT * FROM projects WHERE cwd = ?`)
      .get(cwd) as Record<string, string | number>;
    return this.toProject(row);
  }

  listProjects(): Project[] {
    const rows = this.db
      .prepare(`SELECT * FROM projects ORDER BY pinned DESC, updated_at DESC`)
      .all() as Record<string, string | number>[];
    return rows.map((row) => this.toProject(row));
  }

  setPinned(cwd: string, pinned: boolean): void {
    this.db
      .prepare(`UPDATE projects SET pinned = ?, updated_at = ? WHERE cwd = ?`)
      .run(pinned ? 1 : 0, nowIso(), cwd);
  }

  recordSession(input: {
    id: string;
    projectId: number;
    title?: string;
    modelId?: string | null;
    origin?: string;
  }): SessionRecord {
    const now = nowIso();
    this.db
      .prepare(
        `INSERT INTO sessions (id, project_id, title, status, turn_count, model_id, origin, created_at, updated_at)
         VALUES (?, ?, ?, 'active', 0, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           model_id = excluded.model_id,
           updated_at = excluded.updated_at`,
      )
      .run(
        input.id,
        input.projectId,
        input.title ?? "New session",
        input.modelId ?? null,
        input.origin ?? "helicon",
        now,
        now,
      );
    return this.getSession(input.id);
  }

  listSessionsByProject(projectId: number): SessionRecord[] {
    const rows = this.db
      .prepare(`SELECT * FROM sessions WHERE project_id = ? ORDER BY updated_at DESC`)
      .all(projectId) as Record<string, string | number>[];
    return rows.map((row) => this.toSession(row));
  }

  recordTurn(id: string, sessionId: string): TurnRecord {
    const now = nowIso();
    this.db
      .prepare(
        `INSERT INTO turns (id, session_id, status, created_at, updated_at)
         VALUES (?, ?, 'running', ?, ?)
         ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at`,
      )
      .run(id, sessionId, now, now);
    this.db
      .prepare(
        `UPDATE sessions SET turn_count = turn_count + 1, updated_at = ? WHERE id = ?`,
      )
      .run(now, sessionId);
    return this.getTurn(id);
  }

  updateTurnStatus(id: string, status: string): void {
    this.db
      .prepare(`UPDATE turns SET status = ?, updated_at = ? WHERE id = ?`)
      .run(status, nowIso(), id);
  }

  close(): void {
    this.db.close();
  }

  private getSession(id: string): SessionRecord {
    const row = this.db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as
      | Record<string, string | number>
      | undefined;
    if (!row) {
      throw new Error(`HeliconStore: unknown session ${id}.`);
    }
    return this.toSession(row);
  }

  private getTurn(id: string): TurnRecord {
    const row = this.db.prepare(`SELECT * FROM turns WHERE id = ?`).get(id) as
      | Record<string, string | number>
      | undefined;
    if (!row) {
      throw new Error(`HeliconStore: unknown turn ${id}.`);
    }
    return {
      id: String(row["id"]),
      sessionId: String(row["session_id"]),
      status: String(row["status"]),
      createdAt: String(row["created_at"]),
      updatedAt: String(row["updated_at"]),
    };
  }

  private toProject(row: Record<string, string | number>): Project {
    return {
      id: Number(row["id"]),
      cwd: String(row["cwd"]),
      displayName: String(row["display_name"]),
      pinned: Number(row["pinned"]) === 1,
      createdAt: String(row["created_at"]),
      updatedAt: String(row["updated_at"]),
    };
  }

  private toSession(row: Record<string, string | number>): SessionRecord {
    return {
      id: String(row["id"]),
      projectId: Number(row["project_id"]),
      title: String(row["title"]),
      status: String(row["status"]),
      turnCount: Number(row["turn_count"]),
      modelId: row["model_id"] === null ? null : String(row["model_id"]),
      origin: String(row["origin"]),
      createdAt: String(row["created_at"]),
      updatedAt: String(row["updated_at"]),
    };
  }
}
