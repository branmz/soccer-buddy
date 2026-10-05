import { useEffect } from 'react';

import { getTeam, teamsQuery } from '@/db/repositories/teams';
import { teams as teamsTable, type Team } from '@/db/schema';
import { resolveActiveTeamId } from '@/domain/roster';
import { useLiveData } from '@/hooks/useLiveData';
import { useAppStore } from '@/stores/appStore';

const teamExists = (id: number) => getTeam(id) !== undefined;

/**
 * The active team, kept valid: if the stored team was deleted, falls back to the first team.
 * `team` is null only when no teams exist.
 */
export function useActiveTeam(): {
  team: Team | null;
  teams: Team[];
  setActiveTeamId: (id: number) => void;
} {
  const storedId = useAppStore((s) => s.activeTeamId);
  const setActiveTeamId = useAppStore((s) => s.setActiveTeamId);
  const teams = useLiveData(() => teamsQuery().all(), [], [teamsTable]);
  const activeId = resolveActiveTeamId(storedId, teams, teamExists);

  useEffect(() => {
    if (activeId !== storedId) setActiveTeamId(activeId);
  }, [activeId, storedId, setActiveTeamId]);

  const team =
    activeId === null ? undefined : (teams.find((t) => t.id === activeId) ?? getTeam(activeId));
  return { team: team ?? null, teams, setActiveTeamId };
}
