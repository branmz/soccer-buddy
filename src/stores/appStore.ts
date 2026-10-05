import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isRosterSort, type RosterSort } from '@/domain/roster';

type AppState = {
  /** The team the Tactics, Game Day and History tabs work with. Resolved by useActiveTeam. */
  activeTeamId: number | null;
  setActiveTeamId: (id: number | null) => void;
  /** How the roster screen orders players. */
  rosterSort: RosterSort;
  setRosterSort: (sort: RosterSort) => void;
};

// The kv-store's sync API lets persist hydrate before first render: no "no team" flash.
const syncStorage = createJSONStorage(() => ({
  getItem: (key: string) => Storage.getItemSync(key),
  setItem: (key: string, value: string) => Storage.setItemSync(key, value),
  removeItem: (key: string) => {
    Storage.removeItemSync(key);
  },
}));

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeTeamId: null,
      setActiveTeamId: (activeTeamId) => set({ activeTeamId }),
      rosterSort: 'number',
      setRosterSort: (rosterSort) => set({ rosterSort }),
    }),
    {
      name: 'app-store',
      version: 1,
      storage: syncStorage,
      // Stored values come from disk: drop anything this version doesn't understand.
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          activeTeamId:
            typeof stored.activeTeamId === 'number' ? stored.activeTeamId : current.activeTeamId,
          rosterSort: isRosterSort(stored.rosterSort) ? stored.rosterSort : current.rosterSort,
        };
      },
    },
  ),
);
