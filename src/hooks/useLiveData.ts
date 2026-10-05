import { getTableName, type Table } from 'drizzle-orm';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useEffectEvent, useState, type DependencyList } from 'react';

/** SQLite reports one change event per row; bursts within this window cause one re-read. */
const COALESCE_MS = 16;

function sameDeps(a: DependencyList, b: DependencyList): boolean {
  return a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
}

/**
 * Reads from SQLite synchronously and re-reads whenever any of `tables` changes or `deps`
 * change. Use instead of Drizzle's useLiveQuery, which only watches a query's main table
 * (so joins and counts go stale) and ignores changed inputs unless deps are passed.
 *
 * @example
 * const roster = useLiveData(() => playersQuery(teamId).all(), [teamId], [players]);
 */
export function useLiveData<T>(read: () => T, deps: DependencyList, tables: readonly Table[]): T {
  const [snapshot, setSnapshot] = useState(() => ({ deps, value: read() }));

  // Inputs changed: re-read during render (React's "adjust state on prop change" pattern).
  let current = snapshot;
  if (!sameDeps(snapshot.deps, deps)) {
    current = { deps, value: read() };
    setSnapshot(current);
  }

  const reload = useEffectEvent(() => setSnapshot({ deps, value: read() }));
  const tableKey = tables.map((t) => getTableName(t)).join(',');

  useEffect(() => {
    const watched = new Set(tableKey.split(','));
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        reload();
      }, COALESCE_MS);
    };
    const subscription = addDatabaseChangeListener(({ tableName }) => {
      if (watched.has(tableName)) scheduleReload();
    });
    // Catch writes made between the first read (during render) and subscribing.
    scheduleReload();
    return () => {
      subscription.remove();
      if (timer !== null) clearTimeout(timer);
    };
  }, [tableKey]);

  return current.value;
}
