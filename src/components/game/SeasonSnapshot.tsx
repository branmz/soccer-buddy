import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { ResultBadge, resultLabel } from '@/components/history/ResultBadge';
import { Card } from '@/components/ui/Card';
import type { MatchResult, SeasonRecord } from '@/domain/stats';

type SeasonSnapshotProps = {
  record: SeasonRecord;
  /** The latest results, newest first. */
  form: MatchResult[];
  /** e.g. "Maui 5 · Diego 3 · Lea 2", or null before anyone scores. */
  topScorers: string | null;
};

/**
 * The season at a glance on Game Day, between matches. White, not the dark green of the live
 * card above it (and History's record tiles): only the live match is dark green here.
 */
export function SeasonSnapshot({ record, form, topScorers }: SeasonSnapshotProps) {
  const { played, wins, draws, losses, goalsFor, goalsAgainst } = record;
  return (
    <Card>
      <Line label="Record">
        <View
          accessible
          accessibilityLabel={`Won ${wins}, drawn ${draws}, lost ${losses}. ${played} played, ${goalsFor} goals for, ${goalsAgainst} against`}
          className="gap-0.5"
        >
          <Text className="text-lg font-bold text-ink">
            Won {wins} · Drawn {draws} · Lost {losses}
          </Text>
          <Text className="text-sm text-ink-muted">
            {played} played · GF–GA {goalsFor}–{goalsAgainst}
          </Text>
        </View>
      </Line>
      <Line label="Form">
        <View
          accessible
          accessibilityLabel={`Last ${form.length}, newest first: ${form.map(resultLabel).join(', ')}`}
          className="flex-row items-center gap-1.5"
        >
          {form.map((result, i) => (
            <ResultBadge key={i} result={result} size="sm" />
          ))}
          <Text className="pl-1 text-sm text-ink-muted">newest first</Text>
        </View>
      </Line>
      <Line label="Top scorers">
        <Text className="text-base text-ink">{topScorers ?? 'No goals yet'}</Text>
      </Line>
    </Card>
  );
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-semibold text-ink-muted uppercase">{label}</Text>
      {children}
    </View>
  );
}
