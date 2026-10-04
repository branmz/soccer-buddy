// Test-only: runs Drizzle's expo-sqlite driver against Node's built-in SQLite, so repository
// tests exercise the real queries, migrations and constraints. Never import from app code.
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite';

import type { AppDatabase } from '../client';
import migrations from '../migrations/migrations';
import * as schema from '../schema';

type Row = Record<string, unknown>;

/** The subset of expo-sqlite's statement API that drizzle-orm's expo driver calls. */
function wrapStatement(stmt: StatementSync) {
  const isReader = stmt.columns().length > 0;
  return {
    executeSync(params: SQLInputValue[] = []) {
      if (isReader) {
        const rows = stmt.all(...params) as Row[];
        return {
          changes: 0,
          lastInsertRowId: 0,
          getAllSync: () => rows,
          getFirstSync: () => rows[0] ?? null,
        };
      }
      const result = stmt.run(...params);
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
        getAllSync: () => [],
        getFirstSync: () => null,
      };
    },
    executeForRawResultSync(params: SQLInputValue[] = []) {
      stmt.setReturnArrays(true);
      try {
        // setReturnArrays makes all() return arrays, but its typings still say objects.
        const rows = stmt.all(...params) as unknown as unknown[][];
        return { getAllSync: () => rows };
      } finally {
        stmt.setReturnArrays(false);
      }
    },
  };
}

export type TestDb = { db: AppDatabase; sqlite: DatabaseSync };

export async function createTestDb(): Promise<TestDb> {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const client = { prepareSync: (sql: string) => wrapStatement(sqlite.prepare(sql)) };
  const db = drizzle(client as unknown as SQLiteDatabase, { schema });
  await migrate(db, migrations);
  return { db, sqlite };
}
