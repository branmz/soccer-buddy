import { create } from 'zustand';

import {
  applyDrop,
  applyTap,
  changeSlotPosition,
  clearPlayers,
  type BoardItem,
  type BoardMode,
  type DropTarget,
  type TapTarget,
} from '@/domain/board';
import type { PlayerPosition } from '@/domain/positions';
import type { FormationSlot } from '@/domain/types';

/** How many slot changes Undo can step back through. */
export const UNDO_LIMIT = 50;

/**
 * Working copy of the formation being edited. SQLite stays the source of truth: this is
 * loaded from a saved formation or a preset and written back on Save.
 */
type BoardState = {
  /** Which formation is loaded: a formation id, or `new:<teamId>:<preset>`. */
  key: string | null;
  name: string;
  slots: FormationSlot[];
  /** True when name or slots differ from what was loaded or last saved. */
  dirty: boolean;
  /** The item picked up by a first tap (tap-to-select fallback for dragging). */
  selection: BoardItem | null;
  /** Spots are locked unless the coach turns on "Edit spots" (positions mode). */
  mode: BoardMode;
  /** Earlier slot lists, most recent last. Covers players and spot positions, not the name. */
  undoStack: FormationSlot[][];
  /** What was loaded or last saved; slot transforms keep references, so `!==` means changed. */
  savedName: string;
  savedSlots: FormationSlot[];

  load: (key: string, name: string, slots: FormationSlot[]) => void;
  setName: (name: string) => void;
  drop: (source: BoardItem, target: DropTarget) => void;
  tap: (target: TapTarget) => void;
  clearSelection: () => void;
  setMode: (mode: BoardMode) => void;
  clearPlayers: () => void;
  /** Relabels a spot (Edit spots mode). Never adds or removes the goalkeeper. */
  changePosition: (slotId: string, position: PlayerPosition) => void;
  /** Steps back one slot change. */
  undo: () => void;
  /** After saving: `key` becomes the saved formation's id. */
  markSaved: (key: string) => void;
  /** Forgets the working copy (when the editor closes). */
  reset: () => void;
};

const EMPTY = {
  key: null,
  name: '',
  slots: [],
  dirty: false,
  selection: null,
  mode: 'players' as BoardMode,
  undoStack: [],
  savedName: '',
  savedSlots: [],
};

type Snapshot = Pick<BoardState, 'name' | 'slots' | 'savedName' | 'savedSlots'>;

const isDirty = (s: Snapshot) => s.name !== s.savedName || s.slots !== s.savedSlots;

/** The state after a slot change: remembers the old slots for Undo. */
function withSlots(s: BoardState, slots: FormationSlot[]): Partial<BoardState> {
  return {
    slots,
    undoStack: [...s.undoStack, s.slots].slice(-UNDO_LIMIT),
    dirty: isDirty({ ...s, slots }),
    selection: null,
  };
}

export const useBoardStore = create<BoardState>()((set) => ({
  ...EMPTY,

  load: (key, name, slots) =>
    set({ ...EMPTY, key, name, slots, savedName: name, savedSlots: slots }),
  setName: (name) => set((s) => (name === s.name ? s : { name, dirty: isDirty({ ...s, name }) })),
  drop: (source, target) =>
    set((s) => {
      const slots = applyDrop(s.slots, source, target, s.mode);
      return slots === s.slots ? { selection: null } : withSlots(s, slots);
    }),
  tap: (target) =>
    set((s) => {
      const { slots, selection } = applyTap(s.slots, s.selection, target, s.mode);
      return slots === s.slots ? { selection } : { ...withSlots(s, slots), selection };
    }),
  clearSelection: () => set({ selection: null }),
  setMode: (mode) => set({ mode, selection: null }),
  clearPlayers: () =>
    set((s) => {
      const slots = clearPlayers(s.slots);
      return slots === s.slots ? s : withSlots(s, slots);
    }),
  changePosition: (slotId, position) =>
    set((s) => {
      const slots = changeSlotPosition(s.slots, slotId, position);
      return slots === s.slots ? s : withSlots(s, slots);
    }),
  undo: () =>
    set((s) => {
      const previous = s.undoStack.at(-1);
      if (!previous) return s;
      return {
        slots: previous,
        undoStack: s.undoStack.slice(0, -1),
        dirty: isDirty({ ...s, slots: previous }),
        selection: null,
      };
    }),
  markSaved: (key) => set((s) => ({ key, dirty: false, savedName: s.name, savedSlots: s.slots })),
  reset: () => set(EMPTY),
}));
