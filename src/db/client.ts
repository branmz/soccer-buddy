import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'soccer-buddy.db';

export type AppDatabase = ExpoSQLiteDatabase<typeof schema>;

// enableChangeListener lets useLiveData re-read when tables change.
const sqlite = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
sqlite.execSync('PRAGMA foreign_keys = ON;');

export const db: AppDatabase = drizzle(sqlite, { schema });
