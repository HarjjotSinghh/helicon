import type { TranscriptItem } from "./types.js";

export interface FoldState {
  items: Map<string, TranscriptItem>;
  order: string[];
}

export function emptyFold(): FoldState {
  return { items: new Map(), order: [] };
}

export function applyDelta(
  state: FoldState,
  itemId: string,
  kind: string,
  text: string,
): FoldState {
  const existing = state.items.get(itemId);
  const next: TranscriptItem = existing
    ? { ...existing, text: existing.text + text, status: "running" }
    : { itemId, kind, text, status: "running" };
  const items = new Map(state.items);
  items.set(itemId, next);
  const order = existing ? state.order : [...state.order, itemId];
  return { items, order };
}

export function applyFinal(
  state: FoldState,
  itemId: string,
  kind: string,
  text: string,
): FoldState {
  const items = new Map(state.items);
  items.set(itemId, { itemId, kind, text, status: "final" });
  const order = state.items.has(itemId) ? state.order : [...state.order, itemId];
  return { items, order };
}

export function orderedItems(state: FoldState): TranscriptItem[] {
  return state.order
    .map((id) => state.items.get(id))
    .filter((item): item is TranscriptItem => item !== undefined);
}
