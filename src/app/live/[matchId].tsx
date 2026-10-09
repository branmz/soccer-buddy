import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClockBar } from '@/components/game/ClockBar';
import { FormationBar, FormationEditBar } from '@/components/game/FormationEditBar';
import { FormationPickerSheet, type FormationChoice } from '@/components/game/FormationPickerSheet';
import { EventActionBar } from '@/components/game/EventActionBar';
import { EventTimeline } from '@/components/game/EventTimeline';
import {
  FinishedSummary,
  MinutesPlayedCard,
  TimelineCard,
} from '@/components/game/FinishedSummary';
import { LiveBoard, LiveHint, liveHint } from '@/components/game/LiveBoard';
import { LiveToast, type Toast } from '@/components/game/LiveToast';
import { PlayerPickSheet } from '@/components/game/PlayerPickSheet';
import { QuickSubBar } from '@/components/game/QuickSubBar';
import { RefereeCardIcon } from '@/components/game/RefereeCardIcon';
import { SlotPositionSheet } from '@/components/pitch/SlotPositionSheet';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { userMessage } from '@/db/repositories/errors';
import { eventsQuery } from '@/db/repositories/events';
import {
  applyClockAction,
  recordLiveAction,
  setLiveLayout,
  switchLiveFormation,
  undoLastAction,
} from '@/db/repositories/liveMatch';
import {
  deleteMatch,
  getMatch,
  matchLineup,
  matchLiveLayout,
  matchPeriodsQuery,
} from '@/db/repositories/matches';
import { playersQuery } from '@/db/repositories/players';
import { presetsForMatch, type PresetWithPairs } from '@/db/repositories/presets';
import { getTeam } from '@/db/repositories/teams';
import {
  matchEvents,
  matches,
  matchPeriods,
  players,
  quickSubPresets,
  teams,
  type Player,
} from '@/db/schema';
import {
  applyDrop,
  applyTap,
  changeSlotPosition,
  type BoardItem,
  type DropTarget,
  type TapTarget,
} from '@/domain/board';
import { availableClockActions, periodName, type ClockAction } from '@/domain/clock';
import {
  deriveLineup,
  findPlayerSlot,
  isInMatch,
  onPitchPlayerIds,
  type LiveLineup,
} from '@/domain/lineup';
import { minutesPlayed, minutesWithPlayers } from '@/domain/history';
import { applyLiveTap, liveDropAction } from '@/domain/liveBoard';
import { applyLiveLayout, type LiveFormation } from '@/domain/liveLayout';
import { yellowCardCount, type LiveAction } from '@/domain/matchEvents';
import { matchKitColor } from '@/domain/matchSetup';
import { playingTime } from '@/domain/playingTime';
import { formatPositions } from '@/domain/positions';
import { distinctNames } from '@/domain/roster';
import { matchScore, playerMatchStats } from '@/domain/stats';
import { canSubstitute } from '@/domain/subRules';
import { keyMoments, timelineEntries } from '@/domain/timeline';
import type { FormationSlot } from '@/domain/types';
import { useLiveData } from '@/hooks/useLiveData';
import { useMatchClock } from '@/hooks/useMatchClock';
import { confirmHaptic, rejectHaptic } from '@/lib/haptics';

const MS_PER_MINUTE = 60_000;
/** Minute badges only need to move every few seconds; the board re-renders on these steps. */
const MINUTES_STEP_MS = 5_000;
/** Long enough to look up at play and back before the toast's Undo goes away. */
const TOAST_MS = 7_000;

/** Which player sheet is open: one sheet whose content follows the step. */
type PickStep =
  | { kind: 'scorer' }
  | { kind: 'assist'; scorerId: number | null }
  | { kind: 'card'; color: 'yellow' | 'red' }
  | { kind: 'lateArrival' };

/** Keeps the screen on for as long as it's mounted (only while the match is live). */
function KeepScreenAwake() {
  useKeepAwake();
  return null;
}

export default function LiveMatchScreen() {
  const params = useLocalSearchParams<{ matchId: string }>();
  const matchId = Number(params.matchId);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const match = useLiveData(() => getMatch(matchId), [matchId], [matches]);
  const teamId = match?.teamId ?? null;
  const team = useLiveData(
    () => (teamId === null ? undefined : getTeam(teamId)),
    [teamId],
    [teams],
  );
  // Inactive players too: someone deactivated mid-season can still be in this lineup.
  const roster = useLiveData(
    () => (teamId === null ? [] : playersQuery(teamId).all()),
    [teamId],
    [players],
  );
  const events = useLiveData(() => eventsQuery(matchId).all(), [matchId], [matchEvents]);
  const periods = useLiveData(() => matchPeriodsQuery(matchId).all(), [matchId], [matchPeriods]);
  const presets = useLiveData(
    () => (teamId === null ? [] : presetsForMatch(teamId, matchId)),
    [teamId, matchId],
    [quickSubPresets],
  );
  const periodLengthMs = (match?.periodLengthMinutes ?? 0) * MS_PER_MINUTE;
  const { clock, refresh } = useMatchClock(periods, periodLengthMs);

  const [selection, setSelection] = useState<BoardItem | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  // Sheets keep their content while they slide closed.
  const [pick, setPick] = useState<{ open: boolean; step: PickStep }>({
    open: false,
    step: { kind: 'scorer' },
  });
  const [secondYellow, setSecondYellow] = useState<{ open: boolean; playerId: number | null }>({
    open: false,
    playerId: null,
  });
  // A straight red changes the game (a player down), so it's confirmed like a second yellow.
  const [redConfirm, setRedConfirm] = useState<{ open: boolean; playerId: number | null }>({
    open: false,
    playerId: null,
  });
  const [clockConfirm, setClockConfirm] = useState<{ open: boolean; action: ClockAction }>({
    open: false,
    action: 'endPeriod',
  });
  const [quickSub, setQuickSub] = useState<{
    open: boolean;
    preset: PresetWithPairs | null;
    errors: (string | null)[];
  }>({ open: false, preset: null, errors: [] });
  const [undoOpen, setUndoOpen] = useState(false);
  // Editing the formation mid-match: spots move, players stay where they are.
  const [editingFormation, setEditingFormation] = useState(false);
  // Earlier shapes (and the formation name they had), most recent last.
  const [layoutUndo, setLayoutUndo] = useState<
    { slots: FormationSlot[]; formation: LiveFormation }[]
  >([]);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [positionSheet, setPositionSheet] = useState<{
    open: boolean;
    slot: FormationSlot | null;
  }>({ open: false, slot: null });
  const [moreOpen, setMoreOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // Derived from SQLite on every change: the lineup is replayed from the events.
  const startingJson = match?.startingLineupJson ?? null;
  const starting = useMemo(
    () => (match && startingJson !== null ? matchLineup(match) : null),
    // Only the snapshot matters; the rest of the row changes with every clock write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startingJson],
  );
  const liveLayoutJson = match?.liveLayoutJson ?? null;
  const liveLayout = useMemo(
    () => (match && liveLayoutJson !== null ? matchLiveLayout(match) : null),
    // Only the layout matters; the rest of the row changes with every clock write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveLayoutJson],
  );
  const liveFormation: LiveFormation = {
    name: liveLayout?.name ?? null,
    formationId: liveLayout?.formationId ?? null,
  };
  // Players come from the events; the spots' shape from any mid-match formation edits.
  const lineup = useMemo(
    () => starting && applyLiveLayout(deriveLineup(starting, events), liveLayout?.slots ?? null),
    [starting, events, liveLayout],
  );
  const minutesNow = Math.floor(clock.totalGameMs / MINUTES_STEP_MS) * MINUTES_STEP_MS;
  const minutesById = useMemo(() => {
    const result = new Map<number, number>();
    if (!starting) return result;
    for (const [id, ms] of playingTime(starting, events, minutesNow).msByPlayer) {
      result.set(id, Math.floor(ms / MS_PER_MINUTE));
    }
    return result;
  }, [starting, events, minutesNow]);
  const playersById = useMemo(() => new Map(roster.map((p) => [p.id, p])), [roster]);
  const booked = useMemo(
    () =>
      new Set(
        events
          .filter((e) => e.eventType === 'yellow_card' && e.playerId !== null)
          .map((e) => e.playerId ?? 0),
      ),
    [events],
  );
  const contributions = useMemo(() => playerMatchStats(events), [events]);
  // For plain text (log, toasts, hints): "Michael #3" / "Michael #6" when names clash.
  const namesById = useMemo(() => distinctNames(roster), [roster]);
  const nameOf = useCallback(
    (playerId: number) => namesById.get(playerId) ?? 'Unknown',
    [namesById],
  );
  // Position names as they are now (after any mid-match switch or relabel).
  const slotLabel = useCallback(
    (slotId: string) => lineup?.slots.find((s) => s.slotId === slotId)?.label ?? slotId,
    [lineup],
  );
  const entries = useMemo(
    () => timelineEntries(events, periodLengthMs, { player: nameOf, slot: slotLabel }),
    [events, periodLengthMs, nameOf, slotLabel],
  );
  const minutesFor = useCallback(
    (playerId: number) => `${minutesById.get(playerId) ?? 0}'`,
    [minutesById],
  );

  function show(text: string, tone: Toast['tone']) {
    setToast({ id: Date.now(), text, tone });
  }

  /** Records one action as one event group, with feedback either way. */
  function record(action: LiveAction): boolean {
    try {
      const recorded = recordLiveAction(matchId, action);
      const [entry] = timelineEntries(recorded, periodLengthMs, {
        player: nameOf,
        slot: slotLabel,
      });
      confirmHaptic();
      show(entry ? `${entry.minute} ${entry.text}` : 'Recorded', 'success');
      return true;
    } catch (e) {
      rejectHaptic();
      show(userMessage(e), 'error');
      return false;
    }
  }

  function undo() {
    setUndoOpen(false);
    // The selected player may have moved (e.g. undoing a sub puts them back on the bench).
    setSelection(null);
    try {
      const removed = undoLastAction(matchId);
      if (removed.length > 0) show(`Undone: ${entries[0]?.text ?? 'last event'}`, 'undone');
      confirmHaptic();
    } catch (e) {
      show(userMessage(e), 'error');
    }
  }

  /** Saves an edited shape; the previous one goes on the undo stack. */
  function saveLayout(next: FormationSlot[], previous: FormationSlot[]) {
    try {
      setLiveLayout(matchId, next);
      setLayoutUndo((stack) => [...stack, { slots: previous, formation: liveFormation }]);
    } catch (e) {
      rejectHaptic();
      show(userMessage(e), 'error');
    }
  }

  function undoLayout() {
    const previous = layoutUndo.at(-1);
    if (!previous) return;
    try {
      setLiveLayout(matchId, previous.slots, previous.formation);
      setLayoutUndo((stack) => stack.slice(0, -1));
      setSelection(null);
    } catch (e) {
      show(userMessage(e), 'error');
    }
  }

  /** Switches the shape, then opens the editor so the coach can fine-tune (or undo it). */
  function switchFormation(choice: FormationChoice, previous: FormationSlot[]) {
    setSwitchOpen(false);
    try {
      switchLiveFormation(matchId, choice);
      setLayoutUndo((stack) => [...stack, { slots: previous, formation: liveFormation }]);
      setSelection(null);
      setEditingFormation(true);
      confirmHaptic();
    } catch (e) {
      rejectHaptic();
      show(userMessage(e), 'error');
    }
  }

  function runClock(action: ClockAction) {
    try {
      applyClockAction(matchId, action);
      refresh();
      confirmHaptic();
    } catch (e) {
      rejectHaptic();
      show(userMessage(e), 'error');
    }
  }

  // The board's handlers stay the same function across clock ticks, so a drag in progress
  // never has its gesture rebuilt under the finger. They read the latest render's values.
  const latest = useRef({
    tap: (_target: TapTarget) => undefined as void,
    drop: (_item: BoardItem, _target: DropTarget) => undefined as void,
  });
  useLayoutEffect(() => {
    latest.current = {
      tap: (target) => {
        if (!lineup) return;
        if (editingFormation) {
          const result = applyTap(lineup.slots, selection, target, 'positions');
          setSelection(result.selection);
          if (result.slots !== lineup.slots) saveLayout(result.slots, lineup.slots);
          return;
        }
        const result = applyLiveTap(lineup, selection, target);
        setSelection(result.selection);
        if (result.action) record(result.action);
      },
      drop: (item, target) => {
        setSelection(null);
        if (lineup && editingFormation) {
          const slots = applyDrop(lineup.slots, item, target, 'positions');
          if (slots !== lineup.slots) saveLayout(slots, lineup.slots);
          return;
        }
        const action = lineup && liveDropAction(lineup, item, target);
        if (action) record(action);
      },
    };
  });
  const onBoardTap = useCallback((target: TapTarget) => latest.current.tap(target), []);
  const onBoardDrop = useCallback(
    (item: BoardItem, target: DropTarget) => latest.current.drop(item, target),
    [],
  );

  if (!match || !team || !lineup || !starting) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Match not found"
        message="It may have been deleted."
        action={<Button label="Back to Game Day" onPress={() => router.navigate('/game')} />}
      />
    );
  }

  const kitColor = matchKitColor(team, match.isHome);
  const score = matchScore(events);

  function leaveScreen() {
    if (router.canGoBack()) router.back();
    else router.navigate('/game');
  }

  if (match.status === 'setup') {
    return (
      <EmptyState
        icon="stopwatch-outline"
        title="Not kicked off yet"
        message={`Kick off the match against ${match.opponentName} from its setup screen.`}
        action={<Button label="Back to Game Day" onPress={leaveScreen} />}
      />
    );
  }

  if (match.status === 'finished') {
    const played = minutesWithPlayers(
      minutesPlayed(starting, events, clock.totalGameMs),
      playersById,
    );
    return (
      <>
        <StatusBar style="light" />
        <FinishedSummary
          teamName={team.name}
          opponentName={match.opponentName}
          score={score}
          insetTop={insets.top}
          done={{ onPress: leaveScreen, insetBottom: insets.bottom }}
        >
          <TimelineCard
            title="Key moments"
            entries={keyMoments(entries)}
            emptyText="No goals or red cards."
          />
          <TimelineCard title="Match log" entries={entries} />
          <MinutesPlayedCard minutes={played} stats={contributions} kitColor={kitColor} />
        </FinishedSummary>
      </>
    );
  }

  const onPitch = onPitchPlayerIds(lineup).flatMap((id) => playersById.get(id) ?? []);
  const bench = lineup.bench.flatMap((id) => playersById.get(id) ?? []);
  const squad = [...onPitch, ...bench];
  const hint = liveHint(selection, nameOf, lineup);
  const actions = availableClockActions(clock, match.periodCount);

  function openPick(step: PickStep) {
    setSelection(null);
    setPick({ open: true, step });
  }

  function onPicked(playerId: number | null) {
    const step = pick.step;
    switch (step.kind) {
      case 'scorer':
        if (playerId === null) {
          setPick((p) => ({ ...p, open: false }));
          record({ kind: 'goal', scorerId: null, assistId: null });
        } else {
          setPick({ open: true, step: { kind: 'assist', scorerId: playerId } });
        }
        return;
      case 'assist':
        setPick((p) => ({ ...p, open: false }));
        record({ kind: 'goal', scorerId: step.scorerId, assistId: playerId });
        return;
      case 'card':
        if (playerId === null) return;
        setPick((p) => ({ ...p, open: false }));
        if (step.color === 'red') setRedConfirm({ open: true, playerId });
        else if (yellowCardCount(events, playerId) > 0) setSecondYellow({ open: true, playerId });
        else record({ kind: 'yellowCard', playerId });
        return;
      case 'lateArrival':
        if (playerId === null) return;
        setPick((p) => ({ ...p, open: false }));
        record({ kind: 'lateArrival', playerId });
    }
  }

  const current = lineup;
  /** Where a player is on the pitch now, or their usual positions when they aren't playing. */
  const positionOf = (player: Player) =>
    findPlayerSlot(current, player.id)?.label ?? formatPositions(player);
  const isBenched = (player: Player) => current.bench.includes(player.id);
  const note = (...parts: (string | null)[]) => parts.filter(Boolean).join(' · ') || null;
  // Active players who weren't here at kickoff (and haven't arrived since).
  const notHere = roster.filter((p) => p.isActive && !isInMatch(current, p.id));

  function pickSheetProps(step: PickStep) {
    switch (step.kind) {
      case 'lateArrival':
        return {
          title: 'Who just arrived?',
          header: (
            <Text className="text-base text-gray-600">They join the bench, ready to come on.</Text>
          ),
          players: notHere,
          noteFor: (player: Player) => formatPositions(player) || null,
          emptyText: 'Everyone on the roster is already in this match.',
        };
      case 'scorer':
        return {
          title: 'Who scored?',
          players: onPitch,
          noteFor: positionOf,
          noneLabel: 'Not sure / own goal',
        };
      case 'assist':
        return {
          title: step.scorerId === null ? 'Assist' : `Goal: ${nameOf(step.scorerId)}. Assist?`,
          players: onPitch.filter((p) => p.id !== step.scorerId),
          noteFor: positionOf,
          noneLabel: 'No assist',
        };
      case 'card':
        return {
          title: step.color === 'yellow' ? 'Yellow card for…' : 'Red card for…',
          players: squad,
          header: (
            <SegmentedControl
              label="Card"
              options={[
                {
                  label: 'Yellow',
                  value: 'yellow',
                  icon: <RefereeCardIcon color="yellow" size={20} />,
                  selectedClassName: 'border-yellow-500 bg-yellow-300',
                  selectedTextClassName: 'text-gray-900',
                },
                {
                  label: 'Red',
                  value: 'red',
                  icon: <RefereeCardIcon color="red" size={20} />,
                  selectedClassName: 'border-red-700 bg-red-600',
                  selectedTextClassName: 'text-white',
                },
              ]}
              value={step.color}
              onChange={(color) => setPick({ open: true, step: { kind: 'card', color } })}
            />
          ),
          noteFor: (player: Player) => {
            const yellows = yellowCardCount(events, player.id);
            return note(
              isBenched(player) ? 'Bench' : null,
              positionOf(player),
              yellows > 0 ? `${yellows} yellow` : null,
            );
          },
        };
    }
  }

  function runQuickSub(preset: PresetWithPairs, current: LiveLineup, maxSubs: number | null) {
    setSelection(null);
    const check = canSubstitute(current, maxSubs, preset.substitutions);
    if (check.ok) {
      record({ kind: 'subs', pairs: preset.substitutions });
      return;
    }
    rejectHaptic();
    setQuickSub({ open: true, preset, errors: check.errors });
  }

  const quickValid =
    quickSub.preset?.substitutions.filter((_, i) => quickSub.errors[i] === null) ?? [];
  const clockConfirmText =
    clockConfirm.action === 'finish'
      ? {
          title: 'End the match?',
          message: `Full time against ${match.opponentName}. The clock stops and the match moves to History.`,
          confirm: 'End match',
        }
      : {
          title: `End ${periodName(clock.currentPeriod, match.periodCount)}?`,
          message: 'The clock stops until you start the next period.',
          confirm: `End ${periodName(clock.currentPeriod, match.periodCount)}`,
        };

  return (
    <View className="flex-1 bg-gray-100">
      {/* The clock bar runs under the status bar: dark green, or amber while paused. */}
      <StatusBar style={clock.isPaused ? 'dark' : 'light'} />
      <KeepScreenAwake />
      <ClockBar
        teamName={team.name}
        opponentName={match.opponentName}
        score={score}
        clock={clock}
        periodCount={match.periodCount}
        subsUsed={lineup.subsUsed}
        maxSubs={match.maxSubs}
        actions={actions}
        onAction={(action) => {
          if (action === 'endPeriod' || action === 'finish') {
            setClockConfirm({ open: true, action });
          } else {
            runClock(action);
          }
        }}
        onBack={() => navigation.goBack()}
        onMore={() => setMoreOpen(true)}
        onScorePress={() => setLogOpen(true)}
        insetTop={insets.top}
      />
      {editingFormation ? (
        <FormationEditBar
          selectedSlot={
            selection?.kind === 'slot'
              ? lineup.slots.find((s) => s.slotId === selection.slotId)
              : undefined
          }
          canUndo={layoutUndo.length > 0}
          onChangePosition={(slot) => setPositionSheet({ open: true, slot })}
          onUndo={undoLayout}
          onDone={() => {
            setEditingFormation(false);
            setSelection(null);
            setLayoutUndo([]);
          }}
        />
      ) : hint ? (
        <LiveHint text={hint} onCancel={() => setSelection(null)} />
      ) : (
        <FormationBar
          formationName={liveLayout?.name ?? match.formationName}
          onSwitch={() => setSwitchOpen(true)}
          onEdit={() => {
            setSelection(null);
            setEditingFormation(true);
          }}
        />
      )}
      <View className="flex-1">
        <View className="flex-1 flex-row">
          <LiveBoard
            lineup={lineup}
            playersById={playersById}
            kitColor={kitColor}
            selection={selection}
            mode={editingFormation ? 'positions' : 'players'}
            minutesFor={minutesFor}
            booked={booked}
            stats={contributions}
            onTap={onBoardTap}
            onDrop={onBoardDrop}
          />
        </View>
        {toast && (
          <LiveToast
            key={toast.id}
            toast={toast}
            onUndo={() => {
              setToast(null);
              undo();
            }}
          />
        )}
      </View>
      <QuickSubBar
        presets={presets}
        onPress={(preset) => runQuickSub(preset, lineup, match.maxSubs)}
      />
      <EventActionBar
        onGoal={() => openPick({ kind: 'scorer' })}
        onOpponentGoal={() => record({ kind: 'opponentGoal' })}
        onCard={() => openPick({ kind: 'card', color: 'yellow' })}
        onLog={() => setLogOpen(true)}
        onUndo={() => setUndoOpen(true)}
        canUndo={events.length > 0}
        insetBottom={insets.bottom}
      />

      <PlayerPickSheet
        visible={pick.open}
        kitColor={kitColor}
        onPick={onPicked}
        onClose={() => setPick((p) => ({ ...p, open: false }))}
        {...pickSheetProps(pick.step)}
      />
      <Sheet
        visible={secondYellow.open}
        title="Second yellow"
        onClose={() => setSecondYellow((s) => ({ ...s, open: false }))}
      >
        <Text className="text-base text-gray-700">
          {secondYellow.playerId === null ? '' : nameOf(secondYellow.playerId)} already has a yellow
          card. A second yellow is a red: they leave the pitch and can&apos;t be replaced.
        </Text>
        <Button
          label="Yellow + red (sent off)"
          variant="danger"
          onPress={() => {
            setSecondYellow((s) => ({ ...s, open: false }));
            if (secondYellow.playerId !== null) {
              record({ kind: 'secondYellow', playerId: secondYellow.playerId });
            }
          }}
        />
        <Button
          label="Yellow only"
          variant="secondary"
          onPress={() => {
            setSecondYellow((s) => ({ ...s, open: false }));
            if (secondYellow.playerId !== null) {
              record({ kind: 'yellowCard', playerId: secondYellow.playerId });
            }
          }}
        />
      </Sheet>
      <ConfirmSheet
        visible={redConfirm.open}
        title={`Red card for ${redConfirm.playerId === null ? '' : nameOf(redConfirm.playerId)}?`}
        message={
          redConfirm.playerId !== null && lineup.bench.includes(redConfirm.playerId)
            ? "They're sent off from the bench and can't come on."
            : "They leave the pitch and can't be replaced: your team plays a player down."
        }
        confirmLabel="Red card"
        onConfirm={() => {
          setRedConfirm((r) => ({ ...r, open: false }));
          if (redConfirm.playerId !== null) {
            record({ kind: 'redCard', playerId: redConfirm.playerId });
          }
        }}
        onClose={() => setRedConfirm((r) => ({ ...r, open: false }))}
      />
      <Sheet
        visible={quickSub.open}
        title={quickSub.preset?.presetName ?? 'Quick sub'}
        onClose={() => setQuickSub((q) => ({ ...q, open: false }))}
      >
        <Text className="text-base text-gray-700">Some of these subs can&apos;t be made now:</Text>
        {quickSub.preset?.substitutions.map((pair, i) => (
          <View key={i} className="gap-0.5 border-b border-gray-100 pb-2">
            <Text className="text-base font-semibold text-gray-900">
              {nameOf(pair.inPlayerId)} on for {nameOf(pair.outPlayerId)}
            </Text>
            <Text className={`text-sm ${quickSub.errors[i] ? 'text-red-600' : 'text-green-700'}`}>
              {quickSub.errors[i] ?? 'OK'}
            </Text>
          </View>
        ))}
        {quickValid.length > 0 && (
          <Button
            label={`Make the ${quickValid.length} OK ${quickValid.length === 1 ? 'sub' : 'subs'}`}
            onPress={() => {
              setQuickSub((q) => ({ ...q, open: false }));
              record({ kind: 'subs', pairs: quickValid });
            }}
          />
        )}
        <Button
          label="Cancel"
          variant="secondary"
          onPress={() => setQuickSub((q) => ({ ...q, open: false }))}
        />
      </Sheet>
      <FormationPickerSheet
        visible={switchOpen}
        mode="live"
        teamId={team.id}
        fieldSize={team.fieldSize}
        selected={
          liveLayout?.name
            ? { formationId: liveLayout.formationId, name: liveLayout.name }
            : { formationId: match.formationId, name: match.formationName }
        }
        onPick={(choice) => switchFormation(choice, lineup.slots)}
        onClose={() => setSwitchOpen(false)}
      />
      <SlotPositionSheet
        visible={positionSheet.open}
        slot={positionSheet.slot}
        onPick={(position) => {
          const slot = positionSheet.slot;
          if (!slot) return;
          const next = changeSlotPosition(lineup.slots, slot.slotId, position);
          if (next !== lineup.slots) saveLayout(next, lineup.slots);
          setSelection(null);
        }}
        onClose={() => setPositionSheet((p) => ({ ...p, open: false }))}
      />
      <ConfirmSheet
        visible={undoOpen}
        title="Undo?"
        message={entries[0] ? `Remove ${entries[0].minute} ${entries[0].text}` : 'Nothing to undo'}
        confirmLabel="Undo"
        tone="primary"
        onConfirm={undo}
        onClose={() => setUndoOpen(false)}
      />
      <ConfirmSheet
        visible={clockConfirm.open}
        title={clockConfirmText.title}
        message={clockConfirmText.message}
        confirmLabel={clockConfirmText.confirm}
        tone="primary"
        onConfirm={() => {
          setClockConfirm((c) => ({ ...c, open: false }));
          runClock(clockConfirm.action);
        }}
        onClose={() => setClockConfirm((c) => ({ ...c, open: false }))}
      />
      <Sheet visible={logOpen} title="Match log" onClose={() => setLogOpen(false)}>
        <EventTimeline entries={entries} />
      </Sheet>
      <Sheet visible={moreOpen} title="Match options" onClose={() => setMoreOpen(false)}>
        <Button
          label="Add late arrival"
          icon="person-add"
          variant="secondary"
          onPress={() => {
            setMoreOpen(false);
            openPick({ kind: 'lateArrival' });
          }}
        />
        {actions.includes('finish') && (
          <Button
            label="End match now"
            icon="flag"
            variant="secondary"
            onPress={() => {
              setMoreOpen(false);
              setClockConfirm({ open: true, action: 'finish' });
            }}
          />
        )}
        <Button
          label="Delete match"
          icon="trash-outline"
          variant="dangerOutline"
          onPress={() => {
            setMoreOpen(false);
            setDeleteOpen(true);
          }}
        />
      </Sheet>
      <ConfirmSheet
        visible={deleteOpen}
        title="Delete this match?"
        message={`The match against ${match.opponentName}, its clock and every recorded event will be deleted. This can't be undone.`}
        confirmLabel="Delete match"
        onConfirm={() => {
          setDeleteOpen(false);
          deleteMatch(matchId);
          // The live screen always sits on the tabs.
          router.back();
        }}
        onClose={() => setDeleteOpen(false)}
      />
    </View>
  );
}
