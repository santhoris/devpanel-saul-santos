import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { PublicUser, Role, Status } from "./types";

/** Fila completa de la tabla `users`, incluidos los campos de credenciales. */
export interface UserRow extends PublicUser {
  password_hash: string;
  password_salt: string;
}

const DB_PATH =
  process.env.DB_PATH ?? path.join(process.cwd(), "data", "devpanel.db");

function connect(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const database = new Database(DB_PATH);
  database.pragma("journal_mode = WAL");
  return database;
}

// Singleton: en `next dev` el modulo se reevalua con cada hot-reload; sin esto
// abririamos un handle nuevo a SQLite en cada recompilacion.
const globalForDb = globalThis as typeof globalThis & {
  __devpanelDb?: Database.Database;
};
export const db = globalForDb.__devpanelDb ?? (globalForDb.__devpanelDb = connect());

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    role          TEXT    NOT NULL DEFAULT 'viewer'
                          CHECK (role IN ('admin','editor','viewer')),
    status        TEXT    NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','inactive','pending')),
    password_hash TEXT    NOT NULL,
    password_salt TEXT    NOT NULL,
    created_at    TEXT    NOT NULL,
    last_login    TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);
  CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
`);

/**
 * Hash de password con scrypt nativo de Node.
 * Evitamos bcryptjs: scrypt es mas fuerte, viene en el runtime y no suma una
 * dependencia JS pura que ademas es lenta.
 */
export function hashPassword(
  password: string,
  salt = crypto.randomBytes(16).toString("hex"),
): { hash: string; salt: string } {
  return {
    hash: crypto.scryptSync(password, salt, 64).toString("hex"),
    salt,
  };
}

export function verifyPassword(
  password: string,
  salt: string,
  expectedHex: string,
): boolean {
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  // timingSafeEqual exige buffers del mismo largo; comparamos largo primero.
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

/** Quita los campos de credenciales antes de serializar hacia el cliente. */
export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    created_at: row.created_at,
    last_login: row.last_login,
  };
}

/* ------------------------------------------------------------------ seed -- */

const FIRST_NAMES = [
  "Ana", "Luis", "Maria", "Carlos", "Jose", "Lucia", "Diego", "Sofia", "Jorge",
  "Camila", "Miguel", "Valeria", "Ricardo", "Elena", "Fernando", "Paula", "Andres",
  "Gabriela", "Raul", "Daniela", "Hugo", "Irene", "Pablo", "Natalia", "Sergio",
  "Rosa", "Ivan", "Marta", "Oscar", "Silvia", "Bruno", "Alba", "Tomas", "Clara",
  "Emilio", "Nuria", "Javier", "Eva", "Ruben", "Noelia",
];

const LAST_NAMES = [
  "Ramos", "Torres", "Vargas", "Mendoza", "Castro", "Rojas", "Silva", "Navarro",
  "Ortega", "Delgado", "Paredes", "Fuentes", "Herrera", "Salazar", "Ibarra",
  "Campos", "Cordero", "Reyes", "Guzman", "Cardenas", "Aguilar", "Perez",
  "Suarez", "Dominguez", "Cabrera", "Escobar", "Villalobos", "Montero",
  "Zambrano", "Quintero",
];

const ROLES: Role[] = ["admin", "editor", "viewer", "editor", "viewer", "viewer", "viewer", "editor", "viewer", "viewer"];
const STATUSES: Status[] = ["active", "active", "active", "inactive", "pending"];

/** RNG determinista: el dataset es siempre el mismo en cada maquina. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const slug = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export interface SeedAccount {
  name: string;
  email: string;
  role: Role;
  password: string;
}

/** Cuentas de demostracion que se documentan en el README. */
export const DEMO_ACCOUNTS: SeedAccount[] = [
  { name: "Saul Santos", email: "admin@devpanel.io", role: "admin", password: "Admin123!" },
  { name: "Elena Rios", email: "editor@devpanel.io", role: "editor", password: "Editor123!" },
  { name: "Marta Salas", email: "viewer@devpanel.io", role: "viewer", password: "Viewer123!" },
];

/**
 * Puebla la tabla la primera vez. Es idempotente: si ya hay usuarios no hace
 * nada, asi que puede llamarse en cada arranque del servidor sin duplicar datos.
 */
export function seedIfEmpty(): number {
  const { c: existing } = db
    .prepare("SELECT COUNT(*) AS c FROM users")
    .get() as { c: number };
  if (existing > 0) return 0;

  const rand = mulberry32(20261006);
  const pick = <T>(items: T[]): T => items[Math.floor(rand() * items.length)];
  const demoHash = hashPassword("Password123!");

  const insert = db.prepare(`
    INSERT INTO users (name, email, role, status, password_hash, password_salt, created_at, last_login)
    VALUES (@name, @email, @role, @status, @password_hash, @password_salt, @created_at, @last_login)
  `);

  const now = Date.now();
  const DAY = 86_400_000;
  const BULK = 134;

  const run = db.transaction(() => {
    for (const account of DEMO_ACCOUNTS) {
      const { hash, salt } = hashPassword(account.password);
      insert.run({
        name: account.name,
        email: account.email,
        role: account.role,
        status: "active",
        password_hash: hash,
        password_salt: salt,
        created_at: new Date(now - 400 * DAY).toISOString(),
        last_login: new Date(now - 3_600_000).toISOString(),
      });
    }

    const BULK = 134;
    for (let i = 0; i < BULK; i++) {
      const first = pick(FIRST_NAMES);
      const last = pick(LAST_NAMES);
      const status = pick(STATUSES);
      insert.run({
        name: `${first} ${last}`,
        email: `${slug(first)}.${slug(last)}${i + 1}@devpanel.io`,
        role: pick(ROLES),
        status,
        password_hash: demoHash.hash,
        password_salt: demoHash.salt,
        created_at: new Date(now - Math.floor(rand() * 400) * DAY).toISOString(),
        last_login:
          status === "pending"
            ? null
            : new Date(now - Math.floor(rand() * 60) * DAY).toISOString(),
      });
    }
  });

  run();
  return DEMO_ACCOUNTS.length + BULK;
}
