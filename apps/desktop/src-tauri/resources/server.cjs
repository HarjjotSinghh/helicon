"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../node_modules/@muse-code/sdk/dist/src/fingerprint.js
function fingerprintMismatchMessage(pinned, actual) {
  return [
    "MSP schema fingerprint moved: re-pin after a schema advance.",
    `  pinned by @muse-code/sdk: ${pinned}`,
    `  schema/msp/stable/manifest.json: ${actual}`,
    "",
    "This does NOT mean the SDK is broken. The stable schema bundle advanced",
    "(a #206 enrollment or renderer change). Fix it by running",
    "scripts/regen-msp-pins.sh, which re-pins EXPECTED_SCHEMA_FINGERPRINT and",
    "every other derived copy from the committed stable manifest, then adapt",
    "the facade to whatever the advance actually changed. Never hand-edit",
    "schema/msp/** to match the SDK."
  ].join("\n");
}
function checkServedFingerprint(served, pinned = EXPECTED_SCHEMA_FINGERPRINT) {
  if (served === pinned)
    return void 0;
  return {
    kind: "schemaFingerprintMismatch",
    pinned,
    served,
    message: `host schema fingerprint ${served} differs from the fingerprint this SDK pins (${pinned}); proceeding under additive-optional evolution (SS1.5.4). Re-pin after a schema advance.`
  };
}
var EXPECTED_SCHEMA_FINGERPRINT;
var init_fingerprint = __esm({
  "../../node_modules/@muse-code/sdk/dist/src/fingerprint.js"() {
    EXPECTED_SCHEMA_FINGERPRINT = "sha256:03312c213efd14277a0e0a102f70adeae497a469ca4edf7242f479953ed758b7";
  }
});

// ../../node_modules/@muse-code/sdk/dist/src/errors.js
var MuseSessionDiscardedError, MuseForeignSessionError, MuseGapFillError;
var init_errors = __esm({
  "../../node_modules/@muse-code/sdk/dist/src/errors.js"() {
    MuseSessionDiscardedError = class extends Error {
      constructor(message) {
        super(message);
        this.name = "MuseSessionDiscardedError";
      }
    };
    MuseForeignSessionError = class extends Error {
      constructor(message) {
        super(message);
        this.name = "MuseForeignSessionError";
      }
    };
    MuseGapFillError = class extends Error {
      reason;
      /** The gap's own bounds, verbatim and opaque (tdd SS4.1). */
      after;
      next;
      constructor(reason, after, next, cause) {
        super(`view/gap (${after}, ${next}) could not be filled: ${reason}`, { cause });
        this.name = "MuseGapFillError";
        this.reason = reason;
        this.after = after;
        this.next = next;
      }
    };
  }
});

// ../../node_modules/@muse-code/sdk/dist/src/fold/item-store.js
var ItemStore;
var init_item_store = __esm({
  "../../node_modules/@muse-code/sdk/dist/src/fold/item-store.js"() {
    init_errors();
    ItemStore = class {
      #items = /* @__PURE__ */ new Map();
      /** itemId -> field path -> accumulated text. */
      #deltas = /* @__PURE__ */ new Map();
      /** First-opened order; an itemId appears exactly once. */
      #order = [];
      #terminalUnknown = /* @__PURE__ */ new Set();
      #ephemeralSessionDiscarded = false;
      /**
       * Apply an `item/started` | `item/updated` | `item/completed` payload.
       * Replace iff the incoming revision is strictly higher (INV-003).
       */
      apply(item) {
        this.#assertSessionActive();
        const held = this.#items.get(item.itemId);
        if (held === void 0) {
          this.#items.set(item.itemId, item);
          this.#order.push(item.itemId);
          return { kind: "inserted", itemId: item.itemId };
        }
        if (item.revision <= held.revision) {
          return {
            kind: "ignoredStaleRevision",
            itemId: item.itemId,
            held: held.revision,
            offered: item.revision
          };
        }
        this.#items.set(item.itemId, item);
        return {
          kind: "replaced",
          itemId: item.itemId,
          from: held.revision,
          to: item.revision
        };
      }
      /**
       * Apply an `item/delta`: a UTF-8-safe append to the open item's field named
       * by `field` (default `"text"`), contiguous and lossless in cursor order.
       * The concatenation of all deltas for a field path equals that field's
       * value on the final `item/completed` object (INV-004, tdd SS4.3.1).
       */
      applyDelta(itemId, delta, field = "text") {
        this.#assertSessionActive();
        let fields = this.#deltas.get(itemId);
        if (fields === void 0) {
          fields = /* @__PURE__ */ new Map();
          this.#deltas.set(itemId, fields);
        }
        fields.set(field, (fields.get(field) ?? "") + delta);
        if (!this.#items.has(itemId)) {
          return { kind: "bufferedForAbsentItem", itemId, field };
        }
        return {
          kind: "appended",
          itemId,
          field,
          length: (fields.get(field) ?? "").length
        };
      }
      /** The accumulated delta text for a field path, or `undefined` if none. */
      accumulated(itemId, field = "text") {
        return this.#deltas.get(itemId)?.get(field);
      }
      /** Every field path that has accumulated deltas for this item. */
      accumulatedFields(itemId) {
        const fields = this.#deltas.get(itemId);
        return fields === void 0 ? [] : [...fields.keys()].sort();
      }
      get(itemId) {
        return this.#items.get(itemId);
      }
      has(itemId) {
        return this.#items.has(itemId);
      }
      /** Items in first-opened order (tdd SS4.9.1). */
      list() {
        const out = [];
        for (const id of this.#order) {
          const item = this.#items.get(id);
          if (item !== void 0)
            out.push(item);
        }
        return out;
      }
      /** The id of the most recently opened item, or `undefined` when empty. */
      lastOpenedItemId() {
        return this.#order.at(-1);
      }
      get size() {
        return this.#items.size;
      }
      /**
       * Seed from a snapshot's `state.items` (tdd SS4.9.1): every item at its
       * latest revision at the snapshot cursor, in first-opened order. Seeding
       * REPLACES the store — a snapshot is authoritative (tdd SS4.9), never
       * merged into stale local state.
       *
       * Delta accumulators are intentionally NOT seeded: a snapshot carries
       * streamed fields at their accumulated-so-far values on the item itself,
       * and `view/page` never replays ephemeral-sourced deltas (tdd SS4.7.3).
       */
      seed(items) {
        this.#assertSessionActive();
        this.#items.clear();
        this.#deltas.clear();
        this.#terminalUnknown.clear();
        this.#order.length = 0;
        for (const item of items) {
          if (!this.#items.has(item.itemId))
            this.#order.push(item.itemId);
          this.#items.set(item.itemId, item);
        }
      }
      /**
       * Permanently discard an ephemeral session after abnormal host death.
       *
       * The last wire item remains byte-for-byte intact: terminal-unknown is a
       * client display annotation, never a fabricated `item/completed` or wire
       * status (SS2.13.3b / SS4.4.3). Further events and snapshot seeding are
       * refused because this session has no resume surface.
       */
      markEphemeralHostDeath(isInProgress) {
        if (!this.#ephemeralSessionDiscarded) {
          for (const item of this.#items.values()) {
            if (isInProgress(item))
              this.#terminalUnknown.add(item.itemId);
          }
          this.#ephemeralSessionDiscarded = true;
        }
        return this.#order.filter((itemId) => this.#terminalUnknown.has(itemId)).map((itemId) => ({ kind: "terminalUnknown", itemId }));
      }
      isTerminalUnknown(itemId) {
        return this.#terminalUnknown.has(itemId);
      }
      get ephemeralSessionDiscarded() {
        return this.#ephemeralSessionDiscarded;
      }
      #assertSessionActive() {
        if (this.#ephemeralSessionDiscarded) {
          throw new MuseSessionDiscardedError("ephemeral session was discarded after abnormal host death");
        }
      }
    };
  }
});

// ../../node_modules/@muse-code/sdk/dist/src/fold/state-store.js
var SessionStateStore;
var init_state_store = __esm({
  "../../node_modules/@muse-code/sdk/dist/src/fold/state-store.js"() {
    SessionStateStore = class {
      #values = /* @__PURE__ */ new Map();
      #cursors = /* @__PURE__ */ new Map();
      /**
       * Apply a state event. `cursor` is the event's `viewCursor`; when omitted
       * (a snapshot seed, which carries one cursor for the whole state) the value
       * is taken unconditionally.
       */
      apply(family, value, cursor) {
        const previous = this.#values.get(family);
        if (cursor !== void 0) {
          const seen = this.#cursors.get(family);
          if (seen !== void 0 && cursor === seen) {
            return {
              family,
              previous,
              current: previous ?? null,
              applied: false
            };
          }
          this.#cursors.set(family, cursor);
        }
        this.#values.set(family, value);
        return { family, previous, current: value, applied: true };
      }
      /**
       * Read a family. `undefined` means no fact has ever landed — distinct from
       * `null`, which means a fact cleared it. Absent is never fabricated
       * (tdd SS4.9.1).
       */
      get(family) {
        return this.#values.get(family);
      }
      has(family) {
        return this.#values.has(family);
      }
      /** Every family that holds a value, in insertion order. */
      families() {
        return [...this.#values.keys()];
      }
      /** Seed from a snapshot's state block: authoritative, replaces wholesale. */
      seed(entries, cursor) {
        this.#values.clear();
        this.#cursors.clear();
        for (const [family, value] of entries) {
          this.#values.set(family, value);
          if (cursor !== void 0)
            this.#cursors.set(family, cursor);
        }
      }
    };
  }
});

// ../../node_modules/@muse-code/sdk/dist/src/fold/session-fold.js
var SessionFold;
var init_session_fold = __esm({
  "../../node_modules/@muse-code/sdk/dist/src/fold/session-fold.js"() {
    init_item_store();
    init_state_store();
    SessionFold = class _SessionFold {
      #itemStore = new ItemStore();
      #sessionStateStore = new SessionStateStore();
      /** Items, snapshot-only: the mutators are `apply()`'s, not the consumer's. */
      get items() {
        return this.#itemStore;
      }
      /**
       * Discharge the SS2.13.3b ephemeral host-death obligation over the item
       * half: every item still in progress becomes terminal-unknown and the fold
       * refuses further events (spec FM-002; slice 3's T030b).
       *
       * A FOLD-level method rather than a `FoldItems` entry on purpose. `items` is
       * snapshot-only — an allowlist whose whole job is that a store mutator can
       * never leak onto the consumer surface (PR #23087 review round) — and this
       * IS a mutator. Widening the allowlist to reach it would undo that; routing
       * it here keeps exactly one caller (`Session.hostExited`) and leaves the
       * read surface untouched. The in-progress probe stays the caller's, so the
       * store remains wire-shape-blind (INV-001).
       */
      markEphemeralHostDeath(isInProgress) {
        return this.#itemStore.markEphemeralHostDeath(isInProgress);
      }
      /**
       * The session-state families, keyed by notification method name. Named
       * `sessionState` rather than `state` because the surface contract reserves
       * `state` for the FR-008 aggregate that arrives with snapshot ingestion.
       * Snapshot-only, like `items`.
       */
      get sessionState() {
        return this.#sessionStateStore;
      }
      #turns = /* @__PURE__ */ new Map();
      #pendingApprovals = /* @__PURE__ */ new Map();
      #resolvedApprovals = /* @__PURE__ */ new Map();
      #pendingUserInputs = /* @__PURE__ */ new Map();
      #settledUserInputs = /* @__PURE__ */ new Map();
      #activeTurnId;
      #pendingGap;
      /** The turn currently running, if one is. */
      get activeTurnId() {
        return this.#activeTurnId;
      }
      /**
       * The outstanding delivery hole, or `undefined` when there is none (tdd
       * SS4.8, FM-003).
       *
       * COALESCED, keeping the FIRST `after`: consecutive overflows are one hole
       * from a filler's point of view, which is the client mirror of the server's
       * own D-16487-1 bracket rule. A recovery walks `(after, next)` and calls
       * `gapFilled(next)` with the target it actually reached, so a hole that grew
       * while the walk was in flight cannot be reported filled.
       */
      get pendingGap() {
        return this.#pendingGap;
      }
      /**
       * Is this fold current with the session view?
       *
       * FM-003's "only then reports current": false from the moment a `view/gap`
       * folds until its hole is filled. Live events keep folding meanwhile — they
       * are real facts and dropping them would add a second hole — so this flag is
       * the ONLY statement that the transcript has a hole in it.
       */
      get current() {
        return this.#pendingGap === void 0;
      }
      /**
       * A recovery filled the hole up to `next`. Returns whether it cleared.
       *
       * EQUALITY, never a relational compare (tdd SS4.1): the argument is the
       * target the walk reached, and it clears only when that is still the
       * outstanding target. A gap that arrived mid-walk left a newer `next`, so
       * this answers `false` and the fold stays not-current — the truthful answer,
       * since the second hole is unfilled.
       *
       * A fold-level mutator with the same rationale as `markEphemeralHostDeath`:
       * `items`/`sessionState` are snapshot-only allowlists, and this belongs to
       * neither store.
       */
      gapFilled(next) {
        if (this.#pendingGap?.next !== next)
          return false;
        this.#pendingGap = void 0;
        return true;
      }
      apply(event) {
        if (event.params === null || typeof event.params !== "object" || Array.isArray(event.params)) {
          return { kind: "ignoredMissingParams", method: event.method };
        }
        const typed = event;
        switch (typed.method) {
          case "item/started":
          case "item/updated":
          case "item/completed":
            return { kind: "item", outcome: this.#itemStore.apply(typed.params.item) };
          case "item/delta":
            return {
              kind: "itemDelta",
              outcome: this.#itemStore.applyDelta(typed.params.itemId, typed.params.delta, typed.params.field ?? "text")
            };
          case "turn/started":
            return this.#turnStarted(typed.params);
          case "turn/completed":
            return this.#turnCompleted(typed.params);
          case "turn/retracted":
            return this.#turnRetracted(typed.params);
          case "turn/unqueued":
            return this.#turnUnqueued(typed.params);
          case "turn/retryScheduled":
            return this.#turnRetryScheduled(typed.params);
          case "approval/requested":
            return this.#approvalRequested(typed.params);
          case "approval/updated":
            return this.#approvalUpdated(typed.params);
          case "approval/resolved":
            return this.#approvalResolved(typed.params);
          case "userInput/requested":
            return this.#userInputRequested(typed.params);
          case "userInput/settled":
            return this.#userInputSettled(typed.params);
          case "view/gap":
            return this.#deliveryGap(typed.params);
          case "session/modelChanged":
          case "session/goalChanged":
          case "session/todoListChanged":
          case "session/branchChanged":
          case "session/tokenUsage":
          case "session/contextUsage":
          case "session/approvalModeChanged":
            return {
              kind: "sessionState",
              outcome: this.#sessionStateStore.apply(typed.method, typed.params, typed.params.viewCursor)
            };
          default: {
            const unrecognized = event;
            return { kind: "ignoredUnrecognizedMethod", method: unrecognized.method };
          }
        }
      }
      /** Turns in first-observed order. */
      turns() {
        return [...this.#turns.values()].map((turn) => _SessionFold.#turnSnapshot(turn));
      }
      turn(turnId) {
        const held = this.#turns.get(turnId);
        return held === void 0 ? void 0 : _SessionFold.#turnSnapshot(held);
      }
      /** Approvals awaiting a durable terminal, in first-observed order. */
      pendingApprovals() {
        return [...this.#pendingApprovals.entries()].map(([approvalId, held]) => ({
          approvalId,
          requested: held.requested,
          ...held.latestUpdate !== void 0 ? { latestUpdate: held.latestUpdate } : {}
        }));
      }
      /** The winning durable terminal per approval, in first-observed order. */
      resolvedApprovals() {
        return [...this.#resolvedApprovals.values()];
      }
      /**
       * Prompts awaiting a durable settlement, in first-observed order. The
       * entries ARE the generated request params — the wire shape already carries
       * `userInputId`, so a wrapper would only duplicate it (unlike
       * `PendingApproval`, which earns its wrapper with `latestUpdate`).
       */
      pendingUserInputs() {
        return [...this.#pendingUserInputs.values()];
      }
      /** The winning durable settlement per prompt, in first-observed order. */
      settledUserInputs() {
        return [...this.#settledUserInputs.values()];
      }
      // ---- turn lifecycle -----------------------------------------------------
      #turnStarted(params) {
        const turn = this.#turnFor(params.turnId);
        if (turn.state !== "running") {
          return { kind: "ignoredStaleFrame", method: "turn/started", id: params.turnId };
        }
        turn.commandId = params.commandId;
        turn.state = "running";
        this.#activeTurnId = params.turnId;
        return { kind: "turn", turnId: params.turnId, state: turn.state };
      }
      #turnCompleted(params) {
        const turn = this.#turnFor(params.turnId);
        if (turn.state === "retracted" || turn.state === "unqueued") {
          return { kind: "ignoredStaleFrame", method: "turn/completed", id: params.turnId };
        }
        turn.state = "settled";
        turn.terminal = params.terminal;
        if (params.error !== void 0)
          turn.error = params.error;
        turn.retryScheduled = void 0;
        this.#clearActive(params.turnId);
        return { kind: "turn", turnId: params.turnId, state: turn.state };
      }
      #turnRetracted(params) {
        const turn = this.#turnFor(params.turnId);
        turn.commandId = params.commandId;
        turn.state = "retracted";
        this.#clearActive(params.turnId);
        return { kind: "turn", turnId: params.turnId, state: turn.state };
      }
      #turnUnqueued(params) {
        const turn = this.#turnFor(params.turnId);
        turn.commandId = params.commandId;
        turn.state = "unqueued";
        this.#clearActive(params.turnId);
        return { kind: "turn", turnId: params.turnId, state: turn.state };
      }
      #turnRetryScheduled(params) {
        const turn = this.#turnFor(params.turnId);
        if (turn.state !== "running") {
          return { kind: "ignoredStaleFrame", method: "turn/retryScheduled", id: params.turnId };
        }
        turn.retryScheduled = params;
        return { kind: "turn", turnId: params.turnId, state: turn.state };
      }
      #turnFor(turnId) {
        const held = this.#turns.get(turnId);
        if (held !== void 0)
          return held;
        const fresh = { turnId, state: "running" };
        this.#turns.set(turnId, fresh);
        return fresh;
      }
      #clearActive(turnId) {
        if (this.#activeTurnId === turnId)
          this.#activeTurnId = void 0;
      }
      static #turnSnapshot(turn) {
        return {
          turnId: turn.turnId,
          state: turn.state,
          ...turn.commandId !== void 0 ? { commandId: turn.commandId } : {},
          ...turn.terminal !== void 0 ? { terminal: turn.terminal } : {},
          ...turn.error !== void 0 ? { error: turn.error } : {},
          ...turn.retryScheduled !== void 0 ? { retryScheduled: turn.retryScheduled } : {}
        };
      }
      // ---- the delivery-plane marker ------------------------------------------
      #deliveryGap(params) {
        this.#pendingGap = {
          after: this.#pendingGap?.after ?? params.after,
          next: params.next,
          sessionId: params.sessionId
        };
        return { after: params.after, kind: "deliveryGap", next: params.next };
      }
      // ---- approvals and user input as fold inputs ----------------------------
      #approvalRequested(params) {
        if (this.#resolvedApprovals.has(params.approvalId)) {
          return { kind: "ignoredStaleFrame", method: "approval/requested", id: params.approvalId };
        }
        this.#pendingApprovals.set(params.approvalId, { requested: params });
        return { kind: "approvalPending", approvalId: params.approvalId };
      }
      #approvalUpdated(params) {
        const held = this.#pendingApprovals.get(params.approvalId);
        if (held === void 0) {
          return { kind: "ignoredStaleFrame", method: "approval/updated", id: params.approvalId };
        }
        held.latestUpdate = params;
        return { kind: "approvalPending", approvalId: params.approvalId };
      }
      #approvalResolved(params) {
        this.#pendingApprovals.delete(params.approvalId);
        const firstTerminal = !this.#resolvedApprovals.has(params.approvalId);
        if (firstTerminal)
          this.#resolvedApprovals.set(params.approvalId, params);
        return { kind: "approvalResolved", approvalId: params.approvalId, firstTerminal };
      }
      #userInputRequested(params) {
        if (this.#settledUserInputs.has(params.userInputId)) {
          return { kind: "ignoredStaleFrame", method: "userInput/requested", id: params.userInputId };
        }
        this.#pendingUserInputs.set(params.userInputId, params);
        return { kind: "userInputPending", userInputId: params.userInputId };
      }
      #userInputSettled(params) {
        this.#pendingUserInputs.delete(params.userInputId);
        const firstSettlement = !this.#settledUserInputs.has(params.userInputId);
        if (firstSettlement)
          this.#settledUserInputs.set(params.userInputId, params);
        return { kind: "userInputSettled", userInputId: params.userInputId, firstSettlement };
      }
    };
  }
});

// ../../node_modules/@muse-code/sdk/dist/src/pending/pending-command-set.js
var COMMAND_REJECTED_CODE, COMMAND_REJECTED_KIND, QUEUED_DISPOSITION, PendingCommandSet;
var init_pending_command_set = __esm({
  "../../node_modules/@muse-code/sdk/dist/src/pending/pending-command-set.js"() {
    init_errors();
    COMMAND_REJECTED_CODE = -32030;
    COMMAND_REJECTED_KIND = "commandRejected";
    QUEUED_DISPOSITION = "queued";
    PendingCommandSet = class _PendingCommandSet {
      #entries = /* @__PURE__ */ new Map();
      #ephemeralDiscardedCommandIds;
      #discarded = false;
      #nextSubmissionIndex = 0;
      constructor(options) {
        this.#ephemeralDiscardedCommandIds = options?.discardedCommandIds ?? /* @__PURE__ */ new Set();
      }
      /**
       * Record a submission. `anchorAfterItemId` is the last item present in the
       * client's fold right now (SS4.13 insertion point).
       */
      submitted(params) {
        this.#assertNotEphemeralReplay(params.commandId);
        this.#assertSessionActive();
        if (this.#entries.has(params.commandId)) {
          return;
        }
        const entry = {
          commandId: params.commandId,
          input: params.input,
          anchorAfterItemId: params.anchorAfterItemId ?? null,
          submissionIndex: this.#nextSubmissionIndex++
        };
        if (params.displayText !== void 0)
          entry.displayText = params.displayText;
        this.#entries.set(params.commandId, entry);
      }
      /** The submit (or a replay) was acked. */
      acked(commandId, ack) {
        const entry = this.#entries.get(commandId);
        if (entry === void 0)
          return;
        entry.ack = ack;
      }
      /**
       * The submit (or a replay) answered with an error.
       *
       * Only a durable `commandRejected` (-32030) is a settlement. Every other
       * error admits nothing — the other SS3.1.2 admission errors and SS1's
       * envelope errors, `inputTooLarge` among them — so the entry HOLDS while
       * the client retries with the same `commandId` (SS4.13 "Nothing-admitted
       * errors are not settlements").
       */
      ackErrored(commandId, error) {
        const entry = this.#entries.get(commandId);
        if (entry === void 0)
          return "held";
        if (!_PendingCommandSet.isSettlement(error))
          return "held";
        return this.#retire(entry, this.#rejectionRetirement(entry, error));
      }
      /**
       * The client has decided to stop retrying a nothing-admitted error. The
       * entry must not linger as a durable-looking echo (SS4.13).
       */
      stopRetrying(commandId) {
        const entry = this.#entries.get(commandId);
        if (entry === void 0)
          return void 0;
        return this.#retire(entry, {
          kind: "retryAbandonedByClient",
          commandId,
          input: entry.input,
          restoreToComposer: true
        });
      }
      /**
       * A `userMessage` item carrying this `commandId` folded in: the entry
       * materialized and the item replaces it at the item's own transcript
       * position (SS4.13 "Materialized").
       *
       * Multi-client echo de-duplication falls out of the same join: a
       * `userMessage` with no matching local entry is another client's
       * submission — this returns `undefined` and the caller renders it plainly.
       */
      observedUserMessage(commandId, itemId) {
        const entry = this.#entries.get(commandId);
        if (entry === void 0)
          return void 0;
        return this.#retire(entry, { kind: "materialized", commandId, matchedBy: "userMessage", itemId });
      }
      /**
       * A reclaim this client actually observed (its own reclaim ack, or any live
       * fold D-024's lane charters). Retire immediately — same composer restore,
       * without waiting for a snapshot join (SS4.13 "Reclaimed").
       */
      observedReclaim(commandId) {
        const entry = this.#entries.get(commandId);
        if (entry === void 0)
          return void 0;
        return this.#retire(entry, {
          kind: "reclaimed",
          commandId,
          input: entry.input,
          restoreToComposer: true
        });
      }
      /**
       * Queue movement: a `turn/started` or `turn/completed` for a turn that is
       * NOT the entry's own.
       *
       * SS4.3 carries no view event for a command-intake settlement, so a
       * post-ack rejection reaches a live client only by replay: on each such
       * event a client holding an acked-QUEUED entry MUST re-verify it by
       * replaying its `commandId`. Queue movement is the trigger precisely
       * because a queued turn's fate is decided at its launch boundary — no
       * polling loop and no invented timeout (SS3.1.3 stays intact).
       *
       * @returns the `commandId`s the caller must replay.
       */
      observedQueueMovement(turnId) {
        const out = [];
        for (const entry of this.#entries.values()) {
          if (entry.ack === void 0)
            continue;
          if (entry.ack.disposition !== QUEUED_DISPOSITION)
            continue;
          if (entry.ack.turnId === turnId)
            continue;
          out.push(entry.commandId);
        }
        return out;
      }
      /**
       * Feed back a `commandId` replay answer (SS3.1.1 — always safe).
       *
       * Three shapes, per SS4.13's rejected/abandoned arms:
       *  - a durable rejection: retire (reason `"abandoned"` → Abandoned arm,
       *    any other reason → Rejected arm);
       *  - the original ack, still pending: keep waiting;
       *  - an ack whose staleness only a snapshot can prove: keep waiting — the
       *    reclaimed signature needs `queuedTurns` in hand (`joinSnapshot`).
       */
      replayAnswered(commandId, answer) {
        this.#assertNotEphemeralReplay(commandId);
        const entry = this.#entries.get(commandId);
        if (entry === void 0)
          return "held";
        if (answer.kind === "ack") {
          entry.ack = answer.ack;
          return "held";
        }
        if (!_PendingCommandSet.isSettlement(answer.error))
          return "held";
        return this.#retire(entry, this.#rejectionRetirement(entry, answer.error));
      }
      /**
       * Reconnect with NO snapshot (`history.mode: "none"`, the default
       * cursor-resume path). There is no join to run, so reconnect itself is the
       * trigger: replay each ACKED entry's `commandId` once; resubmit each
       * UNACKED entry's same `commandId` once before any retire-to-composer.
       *
       * Without `queuedTurns` in hand the reclaimed signature is undecidable, so
       * a stale `"queued"` ack waits for the next snapshot join or queue
       * movement — never a locally invented terminal.
       */
      reconnectedWithoutSnapshot() {
        const mustReplay = [];
        const mustResubmit = [];
        for (const entry of this.#ordered()) {
          if (entry.ack === void 0) {
            mustResubmit.push(entry.commandId);
          } else {
            mustReplay.push(entry.commandId);
          }
        }
        return {
          retirements: [],
          mustReplay,
          mustResubmit,
          kept: this.#ordered().map((e) => e.commandId)
        };
      }
      /**
       * Join local entries against an authoritative snapshot (SS4.9), by
       * `commandId`. The five arms, in the order SS4.13 states them.
       */
      joinSnapshot(facts) {
        const retirements = [];
        const mustReplay = [];
        const mustResubmit = [];
        const userMessageItemByCommandId = /* @__PURE__ */ new Map();
        for (const pair of facts.userMessageCommandIds) {
          userMessageItemByCommandId.set(pair.commandId, pair.itemId);
        }
        const queuedIndexByCommandId = /* @__PURE__ */ new Map();
        facts.queuedTurns.forEach((q, index) => queuedIndexByCommandId.set(q.commandId, index));
        for (const entry of this.#ordered()) {
          const { commandId } = entry;
          const userMessageItemId = userMessageItemByCommandId.get(commandId);
          if (userMessageItemId !== void 0) {
            retirements.push(this.#retire(entry, {
              kind: "materialized",
              commandId,
              matchedBy: "userMessage",
              itemId: userMessageItemId
            }));
            continue;
          }
          if (facts.activeTurn?.commandId === commandId) {
            retirements.push(this.#retire(entry, { kind: "materialized", commandId, matchedBy: "activeTurn" }));
            continue;
          }
          const queuedIndex = queuedIndexByCommandId.get(commandId);
          if (queuedIndex !== void 0) {
            entry.queuedOrder = queuedIndex;
            entry.anchorAfterItemId = facts.lastItemId;
            continue;
          }
          if (entry.ack !== void 0 && facts.activeTurn !== null && entry.ack.turnId === facts.activeTurn.turnId) {
            continue;
          }
          if (entry.ack !== void 0) {
            mustReplay.push(commandId);
            continue;
          }
          mustResubmit.push(commandId);
        }
        return {
          retirements,
          mustReplay,
          mustResubmit,
          kept: this.#ordered().map((e) => e.commandId)
        };
      }
      /**
       * The reclaimed signature, decidable only with a snapshot in hand: an
       * acked-queued entry ABSENT from the snapshot's `queuedTurns` whose replay
       * still answers the stale `"queued"` ack retires as *reclaimed* at the
       * snapshot join (SS4.13 "Reclaimed").
       *
       * Call this with the replay answer for a `mustReplay` entry produced by
       * `joinSnapshot`, passing the same snapshot's `queuedTurns` commandIds.
       */
      resolveReplayAtJoin(commandId, answer, snapshotQueuedCommandIds) {
        this.#assertNotEphemeralReplay(commandId);
        const entry = this.#entries.get(commandId);
        if (entry === void 0)
          return "held";
        if (answer.kind === "error") {
          if (!_PendingCommandSet.isSettlement(answer.error))
            return "held";
          return this.#retire(entry, this.#rejectionRetirement(entry, answer.error));
        }
        const stillQueuedByServer = new Set(snapshotQueuedCommandIds).has(commandId);
        if (answer.ack.disposition === QUEUED_DISPOSITION && !stillQueuedByServer) {
          return this.#retire(entry, {
            kind: "reclaimed",
            commandId,
            input: entry.input,
            restoreToComposer: true
          });
        }
        entry.ack = answer.ack;
        return "held";
      }
      /**
       * Abnormal death of an EPHEMERAL-profile host (SS2.13, SS4.4.3 carve-out):
       * nothing is ever settled, replaying a `commandId` at a new host is
       * forbidden, and every entry falls under the discard obligation as
       * terminal-unknown — a client-side annotation, never a wire fact.
       */
      discardEphemeral() {
        const out = [];
        for (const entry of this.#ordered()) {
          this.#ephemeralDiscardedCommandIds.add(entry.commandId);
          out.push(this.#retire(entry, {
            kind: "terminalUnknown",
            commandId: entry.commandId,
            input: entry.input
          }));
        }
        this.#discarded = true;
        return out;
      }
      /** Has the ephemeral discard closed this set? */
      get discarded() {
        return this.#discarded;
      }
      #assertSessionActive() {
        if (this.#discarded) {
          throw new MuseSessionDiscardedError("ephemeral session was discarded after abnormal host death; it accepts no new submissions");
        }
      }
      #assertNotEphemeralReplay(commandId) {
        if (this.#ephemeralDiscardedCommandIds.has(commandId)) {
          throw new MuseSessionDiscardedError(`ephemeral host died; commandId \`${commandId}\` cannot be replayed against a new host`);
        }
      }
      /**
       * Entries in render order.
       *
       * Before any join this is submission order. After a join, entries the
       * server confirmed queued are re-anchored to the end of the reconciled
       * fold and ordered among themselves by `queuedTurns` — so they sort after
       * the submission-anchored entries (steers and unacked), which keep their
       * own anchors. That is SS4.13's "entries render in submission order, and
       * for queued submits the server-confirmed order wins whenever it is
       * observed".
       */
      list() {
        return this.#ordered().map((entry) => {
          const out = {
            commandId: entry.commandId,
            input: entry.input,
            anchorAfterItemId: entry.anchorAfterItemId,
            submissionIndex: entry.submissionIndex,
            ...entry.displayText !== void 0 ? { displayText: entry.displayText } : {},
            ...entry.ack !== void 0 ? { ack: entry.ack } : {},
            ...entry.queuedOrder !== void 0 ? { queuedOrder: entry.queuedOrder } : {}
          };
          return out;
        });
      }
      get(commandId) {
        return this.list().find((e) => e.commandId === commandId);
      }
      has(commandId) {
        return this.#entries.has(commandId);
      }
      get size() {
        return this.#entries.size;
      }
      /**
       * Only a durable `commandRejected` (-32030) settles a command. Everything
       * else admitted nothing (SS4.13).
       *
       * The registry binds `-32030` <-> `commandRejected` one-to-one (SS3.1.2
       * Appendix B), so a response where the two fields DISAGREE is a server
       * fault in which one field still asserts the durable rejection. Either
       * signal settles (OR): SS3.1.2's stated bias for unfamiliar vocabulary is
       * toward terminal ("treat unknown reasons as terminal rejections"), and
       * holding forever on a half-asserted rejection strands the entry as the
       * durable-looking echo SS4.13 forbids.
       */
      static isSettlement(error) {
        return error.code === COMMAND_REJECTED_CODE || error.kind === COMMAND_REJECTED_KIND;
      }
      #rejectionRetirement(entry, error) {
        const reason = error.reason ?? "";
        if (reason === "abandoned") {
          return {
            kind: "abandoned",
            commandId: entry.commandId,
            input: entry.input,
            restoreToComposer: true
          };
        }
        return {
          kind: "rejected",
          commandId: entry.commandId,
          reason,
          input: entry.input,
          restoreToComposer: true
        };
      }
      #retire(entry, retirement) {
        this.#entries.delete(entry.commandId);
        return retirement;
      }
      #ordered() {
        const submissionAnchored = [];
        const launchOrdered = [];
        for (const entry of this.#entries.values()) {
          (entry.queuedOrder === void 0 ? submissionAnchored : launchOrdered).push(entry);
        }
        submissionAnchored.sort((a, b) => a.submissionIndex - b.submissionIndex);
        launchOrdered.sort((a, b) => (a.queuedOrder ?? 0) - (b.queuedOrder ?? 0));
        return [...submissionAnchored, ...launchOrdered];
      }
    };
  }
});

// ../../node_modules/@muse-code/sdk/dist/src/connection/connection.js
function requestKey(id) {
  return `${typeof id === "number" ? "number" : "string"}:${String(id)}`;
}
function utf8ByteLength(text) {
  let bytes = 0;
  for (const scalar of text) {
    const point = scalar.codePointAt(0);
    bytes += point <= 127 ? 1 : point <= 2047 ? 2 : point <= 65535 ? 3 : 4;
  }
  return bytes;
}
function truncateToUtf8Bytes(text, limitBytes) {
  let bytes = 0;
  let end = 0;
  for (const scalar of text) {
    const point = scalar.codePointAt(0);
    const width = point <= 127 ? 1 : point <= 2047 ? 2 : point <= 65535 ? 3 : 4;
    if (bytes + width > limitBytes)
      break;
    bytes += width;
    end += scalar.length;
  }
  return text.slice(0, end);
}
function canonical(value) {
  if (Array.isArray(value))
    return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function createUuidV7Mint() {
  let lastMs = -1;
  let sequence = 0;
  return () => {
    let now = Date.now();
    if (now <= lastMs) {
      now = lastMs;
      sequence += 1;
      if (sequence > 4095) {
        now += 1;
        sequence = 0;
      }
    } else {
      sequence = 0;
    }
    lastMs = now;
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    let timestamp = now;
    for (let index = 5; index >= 0; index -= 1) {
      bytes[index] = timestamp & 255;
      timestamp = Math.floor(timestamp / 256);
    }
    bytes[6] = 112 | sequence >> 8 & 15;
    bytes[7] = sequence & 255;
    bytes[8] = bytes[8] & 63 | 128;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
}
async function defaultRetryDelay(attempt) {
  const ceilingMs = Math.min(2e3, 50 * 2 ** Math.max(0, attempt - 1));
  const delayMs = Math.floor(Math.random() * (ceilingMs + 1));
  await new Promise((resolve2) => setTimeout(resolve2, delayMs));
}
function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
var DEFAULT_FRAME_LIMIT_BYTES, submissionTail, MspError, ProtocolError, Connection;
var init_connection = __esm({
  "../../node_modules/@muse-code/sdk/dist/src/connection/connection.js"() {
    DEFAULT_FRAME_LIMIT_BYTES = 10485760;
    submissionTail = Symbol("Connection.submissionTail");
    MspError = class extends Error {
      code;
      kind;
      data;
      retryable;
      constructor(error) {
        super(error.message);
        this.name = "MspError";
        this.code = error.code;
        this.kind = error.data?.kind ?? "unknown";
        this.data = error.data === void 0 ? {} : { ...error.data };
        this.retryable = error.data?.retryable;
      }
    };
    ProtocolError = class extends Error {
      line;
      constructor(message, line) {
        super(message);
        this.name = "ProtocolError";
        this.line = line;
      }
    };
    Connection = class {
      #transport;
      #frameLimitBytes;
      #mintCommandId;
      #mintRequestId;
      #pending = /* @__PURE__ */ new Map();
      #commands = /* @__PURE__ */ new Map();
      #nextRequestId = 1;
      #serverRequestHandler;
      #notificationHandler;
      #protocolErrorHandler;
      #writeTail = Promise.resolve();
      // Settles when every accepted frame has been HANDED to the transport, as
      // opposed to #writeTail, which settles when the peer has taken it.
      #submitTail = Promise.resolve();
      #writeFailure;
      #buffer = "";
      #bufferBytes = 0;
      // FR-012: incremental accounting — never a full-buffer rescan per chunk
      // FR-012: the last UTF-16 unit of #buffer (-1 when empty), maintained from each
      // fresh chunk so the surrogate-pair reconciliation below never READS #buffer on
      // the hot no-newline path — reading it (charCodeAt/indexOf/regex) flattens the
      // V8 rope and copies the whole buffer per chunk, the O(bytes^2) this FR bans.
      #bufferTailCode = -1;
      #droppingOversized = false;
      #finished = false;
      #closedPromise;
      #resolveClosed;
      constructor(transport, options) {
        this.#transport = transport;
        this.#frameLimitBytes = options?.frameLimitBytes ?? DEFAULT_FRAME_LIMIT_BYTES;
        this.#mintCommandId = options?.mintCommandId ?? createUuidV7Mint();
        this.#mintRequestId = options?.mintRequestId ?? (() => {
          const id = this.#nextRequestId;
          this.#nextRequestId += 1;
          return id;
        });
        this.#closedPromise = new Promise((resolve2) => {
          this.#resolveClosed = resolve2;
        });
        void this.#readLoop();
      }
      get closed() {
        return this.#closedPromise;
      }
      /** See {@link submissionTail}. */
      [submissionTail]() {
        return this.#submitTail;
      }
      request(method, params) {
        if (this.#finished)
          return Promise.reject(new ProtocolError("connection is closed"));
        const id = this.#mintRequestId();
        if (typeof id !== "string" && (typeof id !== "number" || !Number.isInteger(id))) {
          return Promise.reject(new ProtocolError("request id must be a string or integer"));
        }
        if (this.#pending.has(requestKey(id))) {
          return Promise.reject(new ProtocolError(`request id ${String(id)} is already in flight`));
        }
        const request = {
          jsonrpc: "2.0",
          id,
          method,
          ...params === void 0 ? {} : { params }
        };
        return new Promise((resolve2, reject) => {
          this.#pending.set(requestKey(id), { resolve: resolve2, reject });
          void this.#write(request).catch((error) => {
            this.#pending.delete(requestKey(id));
            reject(error);
          });
        });
      }
      /**
       * Take one id from THIS connection's single `commandId` minter (INV-013).
       *
       * Exposed for the callers that need the id BEFORE the ack: `sendUserTurn`
       * records its optimistic SS4.13 entry under it, and an entry created only on
       * the ack is invisible for exactly the window it exists to cover. The
       * alternative was a facade-side mint, which is the second minter INV-013
       * forbids — delegating here keeps the single-minter property intact and
       * preserves the injected `mintCommandId` seam for deterministic transcripts.
       *
       * Pair it with `command(..., { commandId })`, which reuses the id instead of
       * minting a second one.
       */
      mintCommandId() {
        return this.#mintCommandId();
      }
      notify(method, params) {
        const notification = {
          jsonrpc: "2.0",
          method,
          ...params === void 0 ? {} : { params }
        };
        void this.#write(notification).catch((error) => this.#finish(error));
      }
      onServerRequest(handler) {
        this.#serverRequestHandler = handler;
      }
      onNotification(handler) {
        this.#notificationHandler = handler;
      }
      onProtocolError(handler) {
        this.#protocolErrorHandler = handler;
      }
      async flush() {
        await this.#writeTail;
        if (this.#writeFailure !== void 0)
          throw this.#writeFailure;
      }
      async command(method, params, options) {
        const commandId = options?.commandId ?? this.#mintCommandId();
        const commandParams = { ...params, commandId };
        const signature = canonical({ method, params: commandParams });
        const memory = this.#commands.get(commandId);
        if (memory !== void 0 && memory.signature !== signature) {
          throw new ProtocolError(`commandId ${commandId} was reused with a different payload`);
        }
        const remembered = memory ?? { signature };
        this.#commands.set(commandId, remembered);
        const maxAttempts = Math.max(1, options?.maxAttempts ?? 3);
        const retryDelay = options?.retryDelay ?? defaultRetryDelay;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            const ack = await this.request(method, commandParams);
            if (ack["commandId"] !== void 0 && ack["commandId"] !== commandId) {
              throw new ProtocolError(`${method} ack commandId ${String(ack["commandId"])} did not echo ${commandId}`);
            }
            if (remembered.ack !== void 0 && canonical(remembered.ack) !== canonical(ack)) {
              throw new ProtocolError(`${method} replay for commandId ${commandId} did not return a value-identical ack`);
            }
            remembered.ack = { ...ack };
            return ack;
          } catch (error) {
            const retryableNothingAdmitted = error instanceof MspError && (error.code === -32001 && error.kind === "overloaded" || error.code === -32031 && error.kind === "backpressured");
            if (!retryableNothingAdmitted || attempt === maxAttempts)
              throw error;
            await retryDelay(attempt, error);
          }
        }
        throw new ProtocolError("unreachable command retry state");
      }
      async close() {
        const tail = this.#writeTail;
        if (this.#transport.close !== void 0) {
          await this.#transport.close(this.#submitTail);
          await tail;
        } else {
          this.#finish(new ProtocolError("connection closed"));
        }
        await this.#closedPromise;
      }
      async #write(frame) {
        if (this.#finished)
          throw new ProtocolError("connection is closed");
        const line = `${JSON.stringify(frame)}
`;
        let markSubmitted;
        const submitted = new Promise((resolve2) => {
          markSubmitted = resolve2;
        });
        this.#submitTail = this.#submitTail.then(() => submitted);
        const write = this.#writeTail.then(async () => {
          try {
            if (this.#finished)
              throw new ProtocolError("connection is closed");
            const inFlight = this.#transport.write(line);
            markSubmitted();
            await inFlight;
          } catch (error) {
            markSubmitted();
            throw error;
          }
        });
        this.#writeTail = write.catch((error) => {
          this.#writeFailure = error;
          this.#finish(error);
        });
        await write;
      }
      async #readLoop() {
        try {
          for await (const chunk of this.#transport.incoming)
            this.#ingest(chunk);
          if (!this.#droppingOversized && this.#buffer.length > 0) {
            this.#protocolError(new ProtocolError("inbound frame ended without a newline", this.#buffer));
          }
          this.#finish(new ProtocolError("connection reached EOF"));
        } catch (error) {
          this.#finish(error);
        }
      }
      #ingest(chunk) {
        let remaining = chunk;
        if (this.#droppingOversized) {
          const newline = remaining.indexOf("\n");
          if (newline < 0)
            return;
          this.#droppingOversized = false;
          remaining = remaining.slice(newline + 1);
        }
        if (remaining.length === 0)
          return;
        const chunkHead = remaining.charCodeAt(0);
        if (this.#bufferTailCode >= 55296 && this.#bufferTailCode <= 56319 && chunkHead >= 56320 && chunkHead <= 57343) {
          this.#bufferBytes -= 2;
        }
        this.#buffer += remaining;
        this.#bufferBytes += utf8ByteLength(remaining);
        this.#bufferTailCode = remaining.charCodeAt(remaining.length - 1);
        if (remaining.includes("\n")) {
          while (true) {
            const newline = this.#buffer.indexOf("\n");
            if (newline < 0)
              break;
            const line = this.#buffer.slice(0, newline);
            this.#buffer = this.#buffer.slice(newline + 1);
            this.#bufferBytes -= utf8ByteLength(line) + 1;
            this.#line(line);
          }
        }
        if (this.#bufferBytes > this.#frameLimitBytes) {
          this.#protocolError(new ProtocolError(`inbound frame exceeds ${this.#frameLimitBytes} bytes`, truncateToUtf8Bytes(this.#buffer, this.#frameLimitBytes)));
          this.#buffer = "";
          this.#bufferBytes = 0;
          this.#bufferTailCode = -1;
          this.#droppingOversized = true;
        }
      }
      #line(raw) {
        const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
        if (line.trim().length === 0)
          return;
        if (utf8ByteLength(line) > this.#frameLimitBytes) {
          this.#protocolError(new ProtocolError(`inbound frame exceeds ${this.#frameLimitBytes} bytes`, truncateToUtf8Bytes(line, this.#frameLimitBytes)));
          return;
        }
        let parsed;
        try {
          parsed = JSON.parse(line);
        } catch {
          this.#protocolError(new ProtocolError("inbound frame is not valid JSON", line));
          return;
        }
        if (!isObject(parsed) || parsed["jsonrpc"] !== "2.0") {
          this.#protocolError(new ProtocolError("inbound frame is not a JSON-RPC 2.0 object", line));
          return;
        }
        const method = parsed["method"];
        const id = parsed["id"];
        if (typeof method === "string") {
          if (typeof id === "string" || typeof id === "number") {
            if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
              this.#protocolError(new ProtocolError("server request id must be a positive integer", line));
              return;
            }
            void this.#serverRequest(parsed).catch((error) => {
              this.#finish(error);
            });
            return;
          }
          this.#notificationHandler?.(parsed);
          return;
        }
        if (typeof id !== "string" && typeof id !== "number") {
          this.#protocolError(new ProtocolError("response has no usable id", line));
          return;
        }
        this.#response(parsed, id, line);
      }
      #response(frame, id, line) {
        const pending = this.#pending.get(requestKey(id));
        if (pending === void 0) {
          this.#protocolError(new ProtocolError(`response for unknown request id ${String(id)}`, line));
          return;
        }
        const hasResult = Object.hasOwn(frame, "result");
        const hasError = Object.hasOwn(frame, "error");
        if (hasResult === hasError) {
          const violation = new ProtocolError("response must carry exactly one of result or error", line);
          this.#pending.delete(requestKey(id));
          pending.reject(violation);
          this.#protocolError(violation);
          return;
        }
        this.#pending.delete(requestKey(id));
        if (hasResult) {
          const result = frame["result"];
          if (!isObject(result)) {
            pending.reject(new ProtocolError("response result must be an object", line));
            return;
          }
          pending.resolve(result);
          return;
        }
        const error = frame["error"];
        if (!isObject(error) || typeof error["code"] !== "number" || !Number.isInteger(error["code"]) || typeof error["message"] !== "string") {
          pending.reject(new ProtocolError("error response has an invalid error object", line));
          return;
        }
        const data = error["data"];
        if (!isObject(data) || typeof data["kind"] !== "string") {
          pending.reject(new ProtocolError("MSP error response has no data.kind", line));
          return;
        }
        pending.reject(new MspError({
          code: error["code"],
          message: error["message"],
          data
        }));
      }
      async #serverRequest(request) {
        const id = request.id;
        try {
          if (this.#serverRequestHandler === void 0) {
            throw new MspError({
              code: -32601,
              message: `method not found: ${request.method}`,
              data: { kind: "methodNotFound", retryable: false }
            });
          }
          const result = await this.#serverRequestHandler(request);
          await this.#write({ jsonrpc: "2.0", id, result }).catch((writeError) => this.#finish(writeError));
        } catch (error) {
          const typed = error instanceof MspError ? error : new MspError({
            code: -32603,
            message: error instanceof Error ? error.message : "server request handler failed",
            data: { kind: "internal" }
          });
          await this.#write({
            jsonrpc: "2.0",
            id,
            error: {
              code: typed.code,
              message: typed.message,
              data: typed.data
            }
          }).catch((writeError) => this.#finish(writeError));
        }
      }
      #protocolError(error) {
        this.#protocolErrorHandler?.(error);
      }
      #finish(reason) {
        if (this.#finished)
          return;
        this.#finished = true;
        const error = reason instanceof Error ? reason : new ProtocolError(String(reason));
        for (const pending of this.#pending.values())
          pending.reject(error);
        this.#pending.clear();
        this.#resolveClosed?.();
        this.#resolveClosed = void 0;
      }
    };
  }
});

// ../../node_modules/@muse-code/sdk/dist/src/connection/spawn.js
function makeShutdownDeadline(budgetMs) {
  let timer;
  const expired = new Promise((resolve2) => {
    timer = setTimeout(resolve2, budgetMs);
  });
  return {
    expired,
    clear: () => {
      if (timer !== void 0)
        clearTimeout(timer);
      timer = void 0;
    }
  };
}
function classifyExit(processExit, stderrTail) {
  const evidence = [...stderrTail];
  switch (processExit.code) {
    case 0:
      return { kind: "cleanShutdown" };
    case 1:
      return { kind: "unhandledError", exitCode: 1, stderrTail: evidence };
    case 2:
      return { kind: "usageError", exitCode: 2, stderrTail: evidence, retry: "never" };
    case 3:
      return { kind: "configError", exitCode: 3, stderrTail: evidence, retry: "fix-config" };
    case 4:
      return {
        kind: "leaseUnavailable",
        exitCode: 4,
        stderrTail: evidence,
        retry: "after-lease-release"
      };
    case 5:
      return {
        kind: "sdkSurfaceUnavailable",
        exitCode: 5,
        stderrTail: evidence,
        retry: "never"
      };
    default:
      return {
        kind: "crash",
        exitCode: processExit.code,
        exitSignal: processExit.signal,
        stderrTail: evidence
      };
  }
}
function isBenignCloseRace(error) {
  const code = error?.code;
  return code === "ERR_STREAM_DESTROYED" || code === "EPIPE" || code === "ECANCELED";
}
function assertShutdownTimeout(shutdownTimeoutMs) {
  if (!Number.isInteger(shutdownTimeoutMs) || shutdownTimeoutMs < 0 || shutdownTimeoutMs > MAX_SHUTDOWN_TIMEOUT_MS) {
    throw new RangeError(`shutdownTimeoutMs must be an integer in 0..${MAX_SHUTDOWN_TIMEOUT_MS}, got ${String(shutdownTimeoutMs)}`);
  }
}
function spawnMspConnection(options) {
  return new MspHandshake(options);
}
var import_node_child_process, DEFAULT_STDERR_MAX_BYTES, DEFAULT_STDERR_MAX_LINES, DEFAULT_SHUTDOWN_TIMEOUT_MS, SIGTERM_GRACE_MS, MAX_SHUTDOWN_TIMEOUT_MS, ownedTransport, adoptFlushSource, StderrTail, ChildStdioTransport, MuseServeChild, MspHandshake, SpawnedMspConnection;
var init_spawn = __esm({
  "../../node_modules/@muse-code/sdk/dist/src/connection/spawn.js"() {
    import_node_child_process = require("node:child_process");
    init_connection();
    init_fingerprint();
    DEFAULT_STDERR_MAX_BYTES = 8 * 1024;
    DEFAULT_STDERR_MAX_LINES = 100;
    DEFAULT_SHUTDOWN_TIMEOUT_MS = 3e4;
    SIGTERM_GRACE_MS = 2e3;
    MAX_SHUTDOWN_TIMEOUT_MS = 2147483647;
    ownedTransport = Symbol("MuseServeChild.transport");
    adoptFlushSource = Symbol("ChildStdioTransport.adoptFlushSource");
    StderrTail = class {
      #text = "";
      push(chunk) {
        this.#text += chunk;
        this.#trimLines();
        this.#trimBytes();
      }
      lines() {
        if (this.#text.length === 0)
          return [];
        const lines = this.#text.split("\n");
        if (lines.at(-1) === "")
          lines.pop();
        return lines;
      }
      #trimLines() {
        let lineCount = this.#text.split("\n").length;
        if (this.#text.endsWith("\n"))
          lineCount -= 1;
        while (lineCount > DEFAULT_STDERR_MAX_LINES) {
          const firstBreak = this.#text.indexOf("\n");
          if (firstBreak < 0)
            break;
          this.#text = this.#text.slice(firstBreak + 1);
          lineCount -= 1;
        }
      }
      #trimBytes() {
        const bytes = Buffer.from(this.#text, "utf8");
        if (bytes.byteLength <= DEFAULT_STDERR_MAX_BYTES)
          return;
        let start = bytes.byteLength - DEFAULT_STDERR_MAX_BYTES;
        while (start < bytes.byteLength && (bytes[start] & 192) === 128)
          start += 1;
        this.#text = bytes.subarray(start).toString("utf8");
      }
    };
    ChildStdioTransport = class {
      child;
      incoming;
      exited;
      #shutdownTimeoutMs;
      #makeShutdownDeadline;
      // True only when the boundary that SPAWNED this child made it a process-
      // group leader (FR-017b). Never inferred from the child itself: a test
      // handing the transport an ordinary child keeps the direct-kill path.
      #ownsProcessGroup;
      #closing;
      // The default `flushed` for closes routed AROUND the connection — notably
      // the public `child.close()`. Without it, step 0 existed only for
      // Connection-routed closes while the contract claimed all three surfaces
      // behaved identically, and `#closing ??=` let whichever call won the race
      // discard the other's submission promise (PR #22819 round 4).
      #defaultFlushed;
      constructor(child, onStderr, shutdownTimeoutMs = DEFAULT_SHUTDOWN_TIMEOUT_MS, ownsProcessGroup = false, deadlineFactory = makeShutdownDeadline) {
        this.child = child;
        assertShutdownTimeout(shutdownTimeoutMs);
        this.#shutdownTimeoutMs = shutdownTimeoutMs;
        this.#ownsProcessGroup = ownsProcessGroup;
        this.#makeShutdownDeadline = deadlineFactory;
        this.child.stdout.setEncoding("utf8");
        this.child.stderr.setEncoding("utf8");
        this.child.stderr.on("data", (chunk) => onStderr?.(chunk));
        this.child.stdin.on("error", () => {
        });
        this.incoming = this.#stdoutChunks();
        this.exited = new Promise((resolve2, reject) => {
          this.child.once("error", reject);
          this.child.once("close", (code, signal) => resolve2({ code, signal }));
        });
        this.exited.catch(() => {
        });
      }
      async write(chunk) {
        if (this.child.stdin.destroyed)
          throw new ProtocolError("spawned MSP host stdin is closed");
        await new Promise((resolve2, reject) => {
          this.child.stdin.write(chunk, "utf8", (error) => error ? reject(error) : resolve2());
        });
      }
      /**
       * The single owner of shutdown (#15943). EOF first, then bounded: SS2.1.2
       * gives the host a drain window and says the remainder past it has crash
       * semantics, so past the window the SDK ends the process it owns rather
       * than waiting on an EOF that may never come. Memoized, so concurrent and
       * repeated calls share one attempt and one set of timers.
       */
      /** Module-private friend seam used by the handshake that owns both sides. */
      [adoptFlushSource](source) {
        this.#defaultFlushed = source;
      }
      async close(flushed) {
        this.#closing ??= this.#shutdown(flushed ?? this.#defaultFlushed?.());
        await this.#closing;
      }
      async #shutdown(flushed) {
        const deadline = this.#makeShutdownDeadline(this.#shutdownTimeoutMs);
        try {
          if (flushed !== void 0)
            await this.#beforeDeadline(flushed, deadline.expired);
          return await this.#shutdownAfterFlush(deadline.expired);
        } finally {
          deadline.clear();
        }
      }
      async #shutdownAfterFlush(deadline) {
        const eof = this.#endStdin();
        eof.catch(() => {
        });
        await this.#awaitExitOrTerminate(deadline);
        await eof;
      }
      async #endStdin() {
        if (this.child.stdin.destroyed || this.child.stdin.writableEnded)
          return;
        await new Promise((resolve2, reject) => {
          this.child.stdin.end((error) => error === null || error === void 0 || isBenignCloseRace(error) ? resolve2() : reject(error));
        });
      }
      /**
       * Escalate only as far as the host forces. Every stage ends at the child's
       * REAL exit, so `exited` — and every classification derived from it — stays
       * a function of the observed `(code, signal)` pair (INV-011). A signal is a
       * way to reach an exit, never a substitute for observing one.
       */
      async #awaitExitOrTerminate(deadline) {
        if (await this.#beforeDeadline(this.#settled(), deadline))
          return;
        this.#signal("SIGTERM");
        if (await this.#settledWithin(SIGTERM_GRACE_MS))
          return;
        this.child.stdin.destroy();
        this.#signal("SIGKILL");
        await this.#settled();
      }
      /**
       * One signal per escalation stage, delivered to the whole owned process
       * group where this spawn created one (FR-017b, #22777). The child PID
       * alone is not enough: a grandchild that inherited the host's stdout
       * keeps the `close` event — which `exited` and every stage here wait
       * on — from firing even after the child itself is gone, and it never
       * receives a child-targeted signal at all. A group signal that fails for
       * any reason (expected: `ESRCH`, the whole group already exited between
       * stages) falls through to the direct path, which Node makes a no-op on
       * an exited child — the ladder must never rethrow out of a stage.
       */
      #signal(signal) {
        const pid = this.child.pid;
        if (this.#ownsProcessGroup && pid !== void 0) {
          try {
            process.kill(-pid, signal);
            return;
          } catch {
          }
        }
        this.child.kill(signal);
      }
      /** True once `exited` settles either way — a rejection means no live child. */
      async #settledWithin(budgetMs) {
        return await this.#within(this.#settled(), budgetMs);
      }
      /** True if `work` settles before the one shared shutdown deadline fires. */
      async #beforeDeadline(work, deadline) {
        return await Promise.race([
          work.then(() => true, () => true),
          deadline.then(() => false)
        ]);
      }
      /** True if `work` settles inside `budgetMs`; false when the budget expires. */
      async #within(work, budgetMs) {
        const deadline = makeShutdownDeadline(budgetMs);
        try {
          return await this.#beforeDeadline(work, deadline.expired);
        } finally {
          deadline.clear();
        }
      }
      /**
       * `exited` REJECTS when the spawn itself failed (ENOENT). There is no
       * process to end and no exit to observe, so shutdown is complete; the
       * rejection still reaches the caller through its own `await exited`
       * (`MuseServeChild.close()`, `MspHandshake.close()`), unchanged.
       */
      async #settled() {
        await this.exited.catch(() => {
        });
      }
      async *#stdoutChunks() {
        for await (const chunk of this.child.stdout)
          yield String(chunk);
      }
    };
    MuseServeChild = class _MuseServeChild {
      #tail = new StderrTail();
      #transport;
      exit;
      constructor(child, onStderr, shutdownTimeoutMs, ownsProcessGroup = false) {
        this.#transport = new ChildStdioTransport(child, (chunk) => {
          this.#tail.push(chunk);
          onStderr?.(chunk);
        }, shutdownTimeoutMs, ownsProcessGroup);
        this.exit = this.#transport.exited.then((status) => classifyExit(status, this.#tail.lines()));
        this.exit.catch(() => {
        });
      }
      static spawn(options) {
        if (options.shutdownTimeoutMs !== void 0)
          assertShutdownTimeout(options.shutdownTimeoutMs);
        const ownsProcessGroup = process.platform !== "win32";
        const spawnOptions = {
          ...options.cwd === void 0 ? {} : { cwd: options.cwd },
          ...options.env === void 0 ? {} : { env: options.env },
          detached: ownsProcessGroup
        };
        return new _MuseServeChild((0, import_node_child_process.spawn)(options.museBin, [...options.args ?? []], spawnOptions), options.onStderr, options.shutdownTimeoutMs, ownsProcessGroup);
      }
      get stderrTail() {
        return this.#tail.lines();
      }
      /** Module-private friend seam used by the handshake machine for this child. */
      [ownedTransport]() {
        return this.#transport;
      }
      async close() {
        await this.#transport.close();
        return await this.exit;
      }
    };
    MspHandshake = class {
      #connection;
      child;
      #transport;
      #started = false;
      constructor(options) {
        this.child = MuseServeChild.spawn({
          museBin: options.command,
          ...options.args === void 0 ? {} : { args: options.args },
          ...options.cwd === void 0 ? {} : { cwd: options.cwd },
          ...options.env === void 0 ? {} : { env: options.env },
          ...options.onStderr === void 0 ? {} : { onStderr: options.onStderr },
          ...options.shutdownTimeoutMs === void 0 ? {} : { shutdownTimeoutMs: options.shutdownTimeoutMs }
        });
        this.#transport = this.child[ownedTransport]();
        this.#connection = new Connection(this.#transport, options.connection);
        this.#transport[adoptFlushSource](() => this.#connection[submissionTail]());
      }
      get exited() {
        return this.#transport.exited;
      }
      onServerRequest(handler) {
        this.#connection.onServerRequest(handler);
      }
      onNotification(handler) {
        this.#connection.onNotification(handler);
      }
      onProtocolError(handler) {
        this.#connection.onProtocolError(handler);
      }
      async close() {
        await this.#connection.close();
        return await this.#transport.exited;
      }
      async initialize(params) {
        if (this.#started)
          throw new ProtocolError("initialize may be sent only once per connection");
        this.#started = true;
        const raw = await this.#connection.request("initialize", params);
        const result = raw;
        if (typeof result.schema?.fingerprint !== "string") {
          throw new ProtocolError("initialize result has no schema fingerprint");
        }
        const fingerprintWarning = checkServedFingerprint(result.schema.fingerprint);
        this.#connection.notify("initialized");
        await this.#connection.flush();
        return new SpawnedMspConnection(this.#connection, this.#transport, this.child, result, fingerprintWarning);
      }
    };
    SpawnedMspConnection = class {
      connection;
      child;
      initializeResult;
      fingerprintWarning;
      exited;
      #transport;
      constructor(connection, transport, child, initializeResult, fingerprintWarning) {
        this.connection = connection;
        this.#transport = transport;
        this.child = child;
        this.initializeResult = initializeResult;
        this.fingerprintWarning = fingerprintWarning;
        this.exited = transport.exited;
      }
      async close() {
        await this.connection.close();
        return await this.#transport.exited;
      }
    };
  }
});

// ../../node_modules/@muse-code/sdk/dist/src/facade/discarded.js
var DiscardedSessions;
var init_discarded = __esm({
  "../../node_modules/@muse-code/sdk/dist/src/facade/discarded.js"() {
    DiscardedSessions = class {
      /** `commandId`s an ephemeral discharge retired. Never replayed again. */
      commandIds = /* @__PURE__ */ new Set();
      /** `sessionId`s whose ephemeral host died. Never reattached. */
      sessionIds = /* @__PURE__ */ new Set();
    };
  }
});

// ../../node_modules/@muse-code/sdk/dist/src/facade/host-death.js
function readSessionDurability(result) {
  const declared = result.sessionDurability;
  if (declared === void 0 || declared === DURABLE)
    return { kind: "durable" };
  if (declared === EPHEMERAL)
    return { kind: "ephemeral" };
  return { kind: "unrecognized", value: declared };
}
function survivesHostDeath(profile) {
  return profile.kind === DURABLE;
}
function isAbnormalHostDeath(notification) {
  return notification.kind !== "cleanShutdown";
}
function isItemInProgress(item) {
  return item.status === IN_PROGRESS;
}
var DURABLE, EPHEMERAL, IN_PROGRESS, MuseHostDiedError;
var init_host_death = __esm({
  "../../node_modules/@muse-code/sdk/dist/src/facade/host-death.js"() {
    DURABLE = "durable";
    EPHEMERAL = "ephemeral";
    IN_PROGRESS = "inProgress";
    MuseHostDiedError = class _MuseHostDiedError extends Error {
      exit;
      // The parameter is narrowed rather than checked: `cleanShutdown` is not a
      // death, so the type refuses to build this error for one instead of a
      // ternary papering over a state no caller can reach.
      constructor(exit) {
        super(`MSP host died: ${exit.kind} (${_MuseHostDiedError.#cause(exit)})`);
        this.name = "MuseHostDiedError";
        this.exit = exit;
      }
      static #cause(exit) {
        if (exit.kind === "transportEof")
          return "transport EOF with no orderly close";
        if (exit.kind === "crash" && exit.exitCode === null) {
          return `signal ${String(exit.exitSignal)}`;
        }
        return `exit code ${String(exit.exitCode)}`;
      }
    };
  }
});

// ../../node_modules/@muse-code/sdk/dist/src/facade/approval.js
var ApprovalRouter;
var init_approval = __esm({
  "../../node_modules/@muse-code/sdk/dist/src/facade/approval.js"() {
    ApprovalRouter = class _ApprovalRouter {
      #sessionId;
      #connection;
      #handler;
      #onFailure;
      /**
       * Approval STAGES already decided, keyed by `approvalId` + `requirementId`.
       *
       * Not `approvalId` alone: `requirementId` is SS5.4's multi-stage race guard,
       * so a stage-2 request must get its own decision or the approval pends
       * forever. Not per-request either: a redelivered `approval/requested` for the
       * SAME stage must author no second decide, or a two-stage approval races
       * itself. The key is kept on FAILURE too — a genuinely advancing stage brings
       * a new `requirementId` and therefore a new key, so "ask the consumer once
       * per stage" holds absolutely.
       */
      #decidedStages = /* @__PURE__ */ new Set();
      constructor(sessionId, connection) {
        this.#sessionId = sessionId;
        this.#connection = connection;
      }
      /**
       * Register the decision callback (FR-019).
       *
       * REPLACES any previous handler rather than adding to a list: two handlers
       * would race to decide one approval and only one decision can win, so the
       * loser's would be silently discarded.
       */
      onApproval(handler) {
        this.#handler = handler;
      }
      /** Observe round trips that did not complete. See {@link ApprovalFailure}. */
      onApprovalError(handler) {
        this.#onFailure = handler;
      }
      /**
       * An `approval/requested` folded. Returns the decision round trip to await,
       * or `undefined` when this client authors nothing for it.
       *
       * No handler at all is the supported default posture, NOT a degraded one
       * (D-008): the client runs under the server's own default-deny, and this SDK
       * parks nothing — no queued decision, no synthesized denial, no local hold.
       */
      requested(params) {
        const handler = this.#handler;
        if (handler === void 0)
          return void 0;
        const stage = _ApprovalRouter.#stageKey(params);
        if (this.#decidedStages.has(stage))
          return void 0;
        this.#decidedStages.add(stage);
        return this.#decide(params, handler);
      }
      static #stageKey(params) {
        const requirement = params.currentRequirementId;
        return `${params.approvalId} ${requirement.approvalId}:${String(requirement.sourceIndex)}`;
      }
      async #decide(params, handler) {
        const connection = this.#connection;
        if (connection === void 0) {
          this.#report({
            approvalId: params.approvalId,
            error: new Error("approval/decide needs a connection; this Session was constructed fold-only"),
            kind: "submitFailed"
          });
          return;
        }
        let decision;
        try {
          decision = await handler(params);
        } catch (error) {
          this.#report({ approvalId: params.approvalId, error, kind: "handlerThrew" });
          return;
        }
        const availableChoiceIds = params.availableChoices.map((choice) => choice.choiceId);
        if (!availableChoiceIds.includes(decision.choiceId)) {
          this.#report({
            approvalId: params.approvalId,
            availableChoiceIds,
            choiceId: decision.choiceId,
            kind: "unofferedChoice"
          });
          return;
        }
        const decideParams = {
          approvalId: params.approvalId,
          choiceId: decision.choiceId,
          // Echoed from the request, never remembered: SS5.4 makes a stale value a
          // -32053, and the request in hand is the only current statement of it.
          requirementId: params.currentRequirementId,
          sessionId: this.#sessionId
        };
        if (decision.feedback != null)
          decideParams.feedback = decision.feedback;
        try {
          await connection.command("approval/decide", decideParams);
        } catch (error) {
          this.#report({ approvalId: params.approvalId, error, kind: "submitFailed" });
        }
      }
      #report(failure) {
        try {
          this.#onFailure?.(failure);
        } catch {
        }
      }
    };
  }
});

// ../../node_modules/@muse-code/sdk/dist/src/facade/turn-submit.js
function commandErrorResponse(error) {
  if (!(error instanceof MspError))
    return void 0;
  const reason = error.data["reason"];
  return {
    code: error.code,
    kind: error.kind,
    ...typeof reason === "string" ? { reason } : {}
  };
}
var TurnSubmitter;
var init_turn_submit = __esm({
  "../../node_modules/@muse-code/sdk/dist/src/facade/turn-submit.js"() {
    init_connection();
    TurnSubmitter = class {
      #sessionId;
      #connection;
      #pending;
      /** See the module doc. Pruned on retirement, so it tracks the pending set. */
      #memory = /* @__PURE__ */ new Map();
      constructor(sessionId, connection, pending) {
        this.#sessionId = sessionId;
        this.#connection = connection;
        this.#pending = pending;
      }
      get wired() {
        return this.#connection !== void 0;
      }
      requireConnection(verb) {
        const connection = this.#connection;
        if (connection === void 0) {
          throw new Error(`${verb} needs a connection; this Session was constructed fold-only`);
        }
        return connection;
      }
      /**
       * Record the optimistic SS4.13 entry, then send `turn/start`.
       *
       * The ORDER is the point. An entry created only on the ack is invisible for
       * exactly the window it exists to cover — between the user pressing enter and
       * the host answering — and `anchorAfterItemId` is fixed here, at submission
       * time, because SS4.13's insertion point may never be relocated by events
       * that fold in afterwards.
       */
      async submit(options, anchorAfterItemId) {
        const connection = this.requireConnection("sendUserTurn");
        const commandId = connection.mintCommandId();
        const params = this.#params(commandId, options);
        this.#pending.submitted({
          anchorAfterItemId,
          commandId,
          input: options.composerInput,
          ...params.displayText === void 0 ? {} : { displayText: params.displayText }
        });
        this.#memory.set(commandId, params);
        try {
          const ack = await this.#send(connection, params, commandId);
          this.#pending.acked(commandId, ack);
          return ack;
        } catch (error) {
          const response = commandErrorResponse(error);
          if (response !== void 0) {
            const settled = this.#pending.ackErrored(commandId, response);
            if (settled !== "held")
              this.forgetRetired([settled]);
          }
          throw error;
        }
      }
      /**
       * Re-send one remembered `turn/start` under its ORIGINAL `commandId`
       * (SS3.1.1 — always safe, and the only re-send that is not a double
       * execution).
       *
       * `undefined` means "no answer this set can act on": either this session
       * never authored the command (a caller-seeded entry), or the failure was a
       * transport/protocol one, which proves nothing about the intake.
       */
      async replay(commandId) {
        const params = this.#memory.get(commandId);
        if (params === void 0)
          return void 0;
        const connection = this.requireConnection("turn/start replay");
        try {
          return { ack: await this.#send(connection, params, commandId), kind: "ack" };
        } catch (error) {
          const response = commandErrorResponse(error);
          if (response === void 0)
            return void 0;
          return { error: response, kind: "error" };
        }
      }
      /** Replay one entry and feed the answer back through the live SS4.13 rules. */
      async driveReplay(commandId, into) {
        const answer = await this.replay(commandId);
        if (answer === void 0)
          return;
        const settled = this.#pending.replayAnswered(commandId, answer);
        if (settled !== "held")
          into.push(settled);
      }
      /** Drop the replay memory for retired entries so it tracks the pending set. */
      forgetRetired(retirements) {
        for (const retirement of retirements)
          this.#memory.delete(retirement.commandId);
      }
      async #send(connection, params, commandId) {
        const raw = await connection.command("turn/start", params, { commandId });
        const result = raw;
        return { disposition: result.disposition, turnId: result.turnId };
      }
      /**
       * OPTIONAL MEANS OMITTED, NEVER `null` (tdd SS1.2), and the guards are LOOSE
       * (`!= null`) for the same reason `MuseClient`'s are: the types bind only
       * strict TypeScript consumers, and a plain-JS caller reaching the built
       * `dist` can pass an explicit `null` a `!== undefined` guard would forward.
       */
      #params(commandId, options) {
        const params = {
          commandId,
          input: options.input,
          sessionId: this.#sessionId
        };
        if (options.displayText != null)
          params.displayText = options.displayText;
        if (options.ifBusy != null)
          params.ifBusy = options.ifBusy;
        if (options.reasoningEffort != null)
          params.reasoningEffort = options.reasoningEffort;
        return params;
      }
    };
  }
});

// ../../node_modules/@muse-code/sdk/dist/src/facade/gap-fill.js
var _a, PAGE_LIMIT, NO_RETIREMENTS, GapFiller;
var init_gap_fill = __esm({
  "../../node_modules/@muse-code/sdk/dist/src/facade/gap-fill.js"() {
    init_errors();
    PAGE_LIMIT = 200;
    NO_RETIREMENTS = Promise.resolve([]);
    GapFiller = class {
      #options;
      /** Live frames held while a fill is in flight, in arrival order. */
      #buffer = [];
      #filling = false;
      #cursor = "";
      #onFailure;
      constructor(options) {
        this.#options = options;
      }
      /**
       * Cursors the page served at or after a target — the events whose LIVE twin
       * the wire has yet to deliver.
       *
       * THE LATE HALF of the recipe's overlap discard, and only that half (PR
       * #24930 review rounds 1 and 2). A twin that has already arrived is in the
       * buffer, and `#drain` discards those against its own local set of EVERY
       * paged cursor. This set covers the other window: the wire promises no order
       * between the marker and the frame at `next`, so a twin can legally arrive
       * after the fill completed, when the buffer is gone. Folding it then re-runs
       * its routing — for a `turn/started`, a duplicate SS4.13 queue-movement
       * replay on the wire.
       *
       * SELF-DRAINING: an entry is removed the moment its twin arrives, and only
       * cursors at or after a target ever enter (the walk stops at the page that
       * carries it, so at most one page's worth per target).
       *
       * RESIDUAL, stated rather than hidden: an entry whose twin the wire never
       * delivers — because a LATER hole swallowed it — has no arrival to retire it
       * and stays, a short string each, bounded by one page's worth per TARGET —
       * and a coalesced fill has several, since each extension's reaching page adds
       * its own batch.
       *
       * Two prunes were tried and both were defects, so neither is coming back
       * without a proof neither had. Clearing per fill (round 2) drops the refusal
       * for a twin that is still on its way. Retiring inside the WALK when it meets
       * the cursor before its own target (round 3) looks like page-order proof that
       * the twin was swallowed, but the walk cannot see the BUFFER — a coalescing
       * gap moves the target past a cursor whose twin is sitting in it, and the
       * entry is deleted out from under the drain (round 4). Deciding staleness any
       * other way means ordering two opaque cursors, which tdd SS4.1 forbids.
       */
      #servedTwins = /* @__PURE__ */ new Set();
      /** While true, every live frame but the gap marker itself is held. */
      get filling() {
        return this.#filling;
      }
      /**
       * Was this frame already applied from a page, as part of the overlap the
       * splice discards? Consuming: a twin is refused exactly once.
       *
       * Returns the matched CURSOR rather than a boolean so the caller can report
       * which event it refused without re-reading (and re-defaulting) a field this
       * method already proved is there.
       */
      claimServedTwin(frame) {
        const cursor = _a.#viewCursorOf(frame);
        if (cursor === void 0 || !this.#servedTwins.has(cursor))
          return void 0;
        this.#servedTwins.delete(cursor);
        return cursor;
      }
      /** Observe fills that did not complete. See {@link MuseGapFillError}. */
      onError(handler) {
        this.#onFailure = handler;
      }
      /** Hold one live frame until the paged prefix is in. */
      hold(frame) {
        this.#buffer.push(frame);
      }
      /**
       * Recover the fold's outstanding hole.
       *
       * Called on every `view/gap`, including one that lands mid-fill: the running
       * walk reads its target from `fold.pendingGap` on each pass, so a coalesced
       * hole extends the walk in flight rather than starting a second one racing
       * it for the same cursor stream.
       */
      start() {
        const gap = this.#options.fold.pendingGap;
        if (gap === void 0)
          return NO_RETIREMENTS;
        if (this.#filling)
          return NO_RETIREMENTS;
        const connection = this.#options.connection;
        if (connection === void 0) {
          this.#report(new MuseGapFillError("noConnection", gap.after, gap.next));
          return NO_RETIREMENTS;
        }
        this.#filling = true;
        this.#cursor = gap.after;
        return this.#run(connection);
      }
      async #run(connection) {
        const paged = [];
        let filled = false;
        try {
          await this.#walk(connection, paged);
          filled = true;
        } catch (error) {
          this.#reportFailure(error);
        }
        const drained = this.#drain(paged);
        if (!filled)
          return drained;
        if (this.#options.discarded())
          return drained;
        if (this.#options.fold.pendingGap === void 0)
          return drained;
        const restarted = this.start();
        return Promise.all([drained, restarted]).then(([first, second]) => [...first, ...second]);
      }
      /**
       * Page until the fold's outstanding hole is closed.
       *
       * The outer loop is what makes a mid-walk `view/gap` safe: `gapFilled`
       * refuses to clear a target the fold has since extended, so the walk simply
       * keeps going toward the newer `next` on the SAME cursor stream.
       */
      async #walk(connection, paged) {
        for (; ; ) {
          if (this.#options.discarded())
            return;
          const gap = this.#options.fold.pendingGap;
          if (gap === void 0)
            return;
          const target = gap.next;
          await this.#walkTo(connection, target, gap.after, paged);
          if (this.#options.discarded())
            return;
          if (this.#options.fold.gapFilled(target))
            return;
        }
      }
      async #walkTo(connection, target, after, paged) {
        for (; ; ) {
          if (this.#options.discarded())
            return;
          const result = await this.#page(connection, this.#cursor);
          let reached = false;
          for (const event of result.events) {
            this.#requireOwnSession(event, after, target);
            const cursor = event.params.viewCursor;
            const alreadyApplied = this.#servedTwins.has(cursor);
            if (cursor === target)
              reached = true;
            if (alreadyApplied) {
              continue;
            }
            paged.push(event);
            if (reached)
              this.#servedTwins.add(cursor);
          }
          if (result.nextCursor === null)
            return;
          if (result.events.length === 0 || typeof result.nextCursor !== "string" || result.nextCursor === this.#cursor) {
            throw new MuseGapFillError("pageStalled", after, target);
          }
          this.#cursor = result.nextCursor;
          if (reached)
            return;
        }
      }
      async #page(connection, cursor) {
        const params = {
          cursor,
          limit: PAGE_LIMIT,
          sessionId: this.#options.sessionId
        };
        const raw = await connection.request("view/page", params);
        return raw;
      }
      /**
       * A page that serves another session's events aborts the fill.
       *
       * The same check `Session.apply` makes on a live frame, at the one other
       * place a frame can enter the fold. Folding it would corrupt this
       * transcript with another session's history, and the request that asked for
       * it named this `sessionId`, so there is no reading under which the answer
       * is right.
       */
      #requireOwnSession(event, after, target) {
        const named = event.params?.sessionId;
        if (typeof named === "string" && named !== this.#options.sessionId) {
          throw new MuseGapFillError("pageFailed", after, target, new MuseForeignSessionError(`view/page for ${this.#options.sessionId} served an event for session ${named}`));
        }
      }
      /**
       * Splice: the paged prefix, then the buffered tail minus the overlap.
       *
       * Synchronous up to its return, deliberately. Clearing the buffer and the
       * flag in the same run of code that re-feeds them is what makes the handover
       * atomic — an `await` in the middle would let a live frame arrive after the
       * flag dropped and fold ahead of the tail still waiting in the buffer.
       *
       * It is outside the walk's `try` because the buffered tail must be released
       * on FAILURE too, and it needs no `try` of its own: every frame it re-feeds
       * has already passed the one check `Session.apply` can throw on — the live
       * half at buffer time, the paged half in the walk — so this cannot be the
       * rejection `SessionApplyOutcome.io` promises never to be.
       */
      #drain(paged) {
        const buffered = this.#buffer.splice(0);
        this.#filling = false;
        if (this.#options.discarded())
          return NO_RETIREMENTS;
        const sink = { retirements: [], tasks: [] };
        const served = /* @__PURE__ */ new Set();
        for (const frame of paged) {
          const cursor = _a.#viewCursorOf(frame);
          if (cursor !== void 0)
            served.add(cursor);
          this.#options.apply(frame, sink);
        }
        for (const frame of buffered) {
          const cursor = _a.#viewCursorOf(frame);
          if (cursor !== void 0 && (served.has(cursor) || this.#servedTwins.has(cursor))) {
            this.#servedTwins.delete(cursor);
            continue;
          }
          this.#options.apply(frame, sink);
        }
        if (sink.tasks.length === 0)
          return Promise.resolve(sink.retirements);
        return Promise.all(sink.tasks).then((batches) => [...sink.retirements, ...batches.flat()]);
      }
      static #viewCursorOf(frame) {
        const cursor = frame.params?.viewCursor;
        return typeof cursor === "string" ? cursor : void 0;
      }
      #reportFailure(error) {
        if (error instanceof MuseGapFillError) {
          this.#report(error);
          return;
        }
        const gap = this.#options.fold.pendingGap;
        this.#report(new MuseGapFillError("pageFailed", gap?.after ?? "", gap?.next ?? "", error));
      }
      #report(failure) {
        try {
          this.#onFailure?.(failure);
        } catch {
        }
      }
    };
    _a = GapFiller;
  }
});

// ../../node_modules/@muse-code/sdk/dist/src/facade/turn-handle.js
function isLaunchFailure(outcome) {
  return outcome.kind === "completed" && outcome.params.terminal === TERMINAL_FAILED && outcome.params.error?.kind === LAUNCH_ERROR;
}
var TERMINAL_FAILED, LAUNCH_ERROR, PushStream, TurnHandle;
var init_turn_handle = __esm({
  "../../node_modules/@muse-code/sdk/dist/src/facade/turn-handle.js"() {
    TERMINAL_FAILED = "failed";
    LAUNCH_ERROR = "launchError";
    PushStream = class {
      #buffer = [];
      #onFinished;
      /**
       * FIFO, not a single slot. `items()`/`deltas()` hand out a plain
       * `AsyncIterableIterator`, so `Promise.all([it.next(), it.next()])` prefetch
       * is a reasonable thing for a consumer to write — and a single slot let the
       * second call overwrite the first waiter, leaving the first promise never
       * settled and handing its value to the second caller. A silently
       * never-settling promise is the hang class this file exists to prevent.
       */
      #waiters = [];
      #ended = false;
      #failure;
      /**
       * `onFinished` deregisters this stream from its owner. Without it a consumer
       * that `break`s out of a `for await` — or simply drops the iterator — stays
       * in the fan-out set for the rest of the turn, so every later event is
       * pushed into a stream nobody reads. A render loop that re-attaches per
       * frame would grow one dead stream per frame.
       */
      constructor(onFinished) {
        this.#onFinished = onFinished;
      }
      push(value) {
        if (this.#ended)
          return;
        const waiter = this.#waiters.shift();
        if (waiter === void 0) {
          this.#buffer.push(value);
          return;
        }
        waiter.resolve({ done: false, value });
      }
      end() {
        if (this.#ended)
          return;
        this.#ended = true;
        for (const waiter of this.#waiters.splice(0)) {
          waiter.resolve({ done: true, value: void 0 });
        }
      }
      fail(error) {
        if (this.#ended)
          return;
        this.#ended = true;
        this.#failure = error;
        for (const waiter of this.#waiters.splice(0))
          waiter.reject(error);
      }
      next() {
        if (this.#buffer.length > 0) {
          return Promise.resolve({ done: false, value: this.#buffer.shift() });
        }
        if (this.#failure !== void 0)
          return Promise.reject(this.#failure);
        if (this.#ended)
          return Promise.resolve({ done: true, value: void 0 });
        return new Promise((resolve2, reject) => {
          this.#waiters.push({ reject, resolve: resolve2 });
        });
      }
      /** `break`/`return` inside a `for await`: drop the backlog and finish. */
      return() {
        this.#buffer.length = 0;
        this.end();
        this.#onFinished();
        return Promise.resolve({ done: true, value: void 0 });
      }
      [Symbol.asyncIterator]() {
        return this;
      }
    };
    TurnHandle = class {
      turnId;
      #replayItems;
      #itemStreams = /* @__PURE__ */ new Set();
      #deltaStreams = /* @__PURE__ */ new Set();
      #completed;
      #settle;
      #fail;
      #observedStart = false;
      #settled = false;
      /**
       * Retained so an iterator opened AFTER the failure reports it too. Without
       * it a late `items()` saw only `#settled` and ended cleanly — handing the
       * consumer a partial replay plus a tidy `done`, i.e. an unfinished turn
       * rendered as finished, which is the invented completion INV-006 forbids.
       */
      #failure;
      constructor(turnId, replayItems) {
        this.turnId = turnId;
        this.#replayItems = replayItems;
        this.#completed = new Promise((resolve2, reject) => {
          this.#settle = resolve2;
          this.#fail = reject;
        });
        this.#completed.catch(() => {
        });
      }
      /** Settles on `turn/completed`, `turn/unqueued`, or the ephemeral discard. */
      get completed() {
        return this.#completed;
      }
      /**
       * How many iterators this handle is still fanning out to.
       *
       * Exposed so the deregistration contract is assertable: an iterator a
       * consumer broke out of, or simply dropped, must leave this set rather than
       * accumulate for the rest of the turn.
       */
      get liveStreamCount() {
        return this.#itemStreams.size + this.#deltaStreams.size;
      }
      /** Did a `turn/started` ever fold for this turn? */
      get observedStart() {
        return this.#observedStart;
      }
      /**
       * This turn's items: everything the fold already holds for it, at its
       * current revision and in first-opened order, then the live tail — one yield
       * per fold-observed revision CHANGE. A stale re-emission mutates nothing
       * (INV-003) and therefore yields nothing.
       *
       * The iterator ends when the turn settles; it never ends on a local timeout.
       */
      items() {
        const stream = new PushStream(() => this.#itemStreams.delete(stream));
        for (const item of this.#replayItems())
          stream.push(item);
        this.#admit(stream, this.#itemStreams);
        return stream;
      }
      /**
       * This turn's `item/delta` frames, live only.
       *
       * Deliberately NOT replayed, and the asymmetry with `items()` is a fact
       * about the fold rather than an oversight: the store holds each item at its
       * latest revision plus the ACCUMULATED delta text per field path
       * (`ItemStore.accumulated`), never the delta event sequence. A consumer
       * attaching mid-turn reads the accumulated value from the fold; there is no
       * retained event list to replay, and inventing one would be a second copy of
       * state that INV-002's determinism would then have to defend.
       */
      deltas() {
        const stream = new PushStream(() => this.#deltaStreams.delete(stream));
        this.#admit(stream, this.#deltaStreams);
        return stream;
      }
      /**
       * Register a fresh stream, or finish it the way this turn already finished.
       * The failure branch comes FIRST: a turn that failed is not a turn that
       * ended. `PushStream` drains the replay before reporting either, so a late
       * consumer still receives everything it was owed.
       */
      #admit(stream, into) {
        if (this.#failure !== void 0)
          stream.fail(this.#failure);
        else if (this.#settled)
          stream.end();
        else
          into.add(stream);
      }
      // ---- fed by Session -----------------------------------------------------
      markStarted() {
        this.#observedStart = true;
      }
      pushItem(item) {
        for (const stream of this.#itemStreams)
          stream.push(item);
      }
      pushDelta(params) {
        for (const stream of this.#deltaStreams)
          stream.push(params);
      }
      settleCompleted(params) {
        this.#finish({ kind: "completed", observedStart: this.#observedStart, params });
      }
      settleUnqueued(params) {
        this.#finish({ kind: "unqueued", params });
      }
      /** SS2.13.3b: an ephemeral host died; stop waiting for a terminal. */
      settleTerminalUnknown() {
        this.#finish({ kind: "terminalUnknown" });
      }
      /**
       * A DURABLE host died abnormally. The waiter gets no answer here — FM-001
       * puts the terminals on resume — so it is rejected rather than resolved: a
       * resolution would be the invented terminal INV-006 forbids, and silence
       * would be the SS3.1.4 hang.
       */
      fail(error) {
        if (this.#settled)
          return;
        this.#settled = true;
        this.#failure = error;
        this.#fail?.(error);
        this.#clear();
        for (const stream of this.#itemStreams)
          stream.fail(error);
        for (const stream of this.#deltaStreams)
          stream.fail(error);
        this.#itemStreams.clear();
        this.#deltaStreams.clear();
      }
      #finish(outcome) {
        if (this.#settled)
          return;
        this.#settled = true;
        this.#settle?.(outcome);
        this.#clear();
        for (const stream of this.#itemStreams)
          stream.end();
        for (const stream of this.#deltaStreams)
          stream.end();
        this.#itemStreams.clear();
        this.#deltaStreams.clear();
      }
      #clear() {
        this.#settle = void 0;
        this.#fail = void 0;
      }
    };
  }
});

// ../../node_modules/@muse-code/sdk/dist/src/facade/session.js
var USER_MESSAGE, NO_IO, Session;
var init_session = __esm({
  "../../node_modules/@muse-code/sdk/dist/src/facade/session.js"() {
    init_session_fold();
    init_pending_command_set();
    init_approval();
    init_turn_submit();
    init_gap_fill();
    init_host_death();
    init_errors();
    init_turn_handle();
    USER_MESSAGE = "userMessage";
    NO_IO = Promise.resolve([]);
    Session = class _Session {
      sessionId;
      /** See {@link SessionOpening}. Absent when the caller built this directly. */
      opening;
      #pending;
      #discarded;
      /** `turn/start` submission and same-`commandId` replay (`turn-submit.ts`). */
      #submit;
      /** The FR-019 round trip (`approval.ts`). */
      #approvals;
      /** The FR-020 splice-fill (`gap-fill.ts`). */
      #gaps;
      #fold = new SessionFold();
      #durability;
      /** The first discharge, replayed verbatim on every later call. */
      #discharge;
      /** Set on a durable abnormal death, so late handles inherit the rejection. */
      #deathError;
      #turns = /* @__PURE__ */ new Map();
      /**
       * `item/delta` frames whose item the fold does not hold yet. The store
       * already buffers the delta TEXT against the item's arrival (SS4.7.3, spec
       * Edge Cases); a delta's TURN is equally unknowable until then, so the
       * frames wait here and are attributed when the item lands. Dropping them
       * instead would put a silent hole in the very iterators FR-020 forbids one
       * in. Bounded by the same fact that bounds the store's own buffer: the
       * durable `item/completed` always lands the item.
       */
      #unattributedDeltas = /* @__PURE__ */ new Map();
      constructor(options) {
        this.sessionId = options.sessionId;
        this.#durability = options.durability;
        this.#discarded = options.discarded;
        this.opening = options.opening;
        this.#pending = new PendingCommandSet(options.discarded === void 0 ? void 0 : { discardedCommandIds: options.discarded.commandIds });
        this.#submit = new TurnSubmitter(options.sessionId, options.connection, this.#pending);
        this.#approvals = new ApprovalRouter(options.sessionId, options.connection);
        this.#gaps = new GapFiller({
          apply: (frame, into) => this.#foldAndRoute(frame, into),
          connection: options.connection,
          discarded: () => this.#discharge?.kind === "discharged",
          fold: this.#fold,
          sessionId: options.sessionId
        });
      }
      get durability() {
        return this.#durability;
      }
      /** Read-only; events enter through `apply` so turn routing cannot be skipped. */
      get fold() {
        return this.#fold;
      }
      /** The SS4.13 set, minus the three mutators `Session` drives itself. */
      get pending() {
        return this.#pending;
      }
      /**
       * How many turns this session has minted a handle for.
       *
       * Distinct from `fold.turns()`, which counts turns the WIRE named: a handle
       * is also minted by `turn()` and by item routing, so this is the number that
       * reveals a phantom turn minted from a bad key (a `userShell` item's null
       * `turnId`, say). Read-only and observation-only.
       *
       * @internal Test observability, stripped from the published declarations
       * (`stripInternal`). `Session` is barrel-exported, so without this the getter
       * would be frozen API the moment #211 adopts the package — the same call
       * `liveStreamCount` got by staying off the public `Turn` (Constitution XI).
       */
      get knownTurnCount() {
        return this.#turns.size;
      }
      apply(event) {
        const named = event.params?.sessionId;
        if (typeof named === "string" && named !== this.sessionId) {
          throw new MuseForeignSessionError(`event ${event.method} belongs to session ${named}, not ${this.sessionId}`);
        }
        if (this.#discharge?.kind === "discharged") {
          return { fold: { kind: "refusedSessionDiscarded" }, io: NO_IO, retirements: [] };
        }
        if (this.#gaps.filling && event.method !== "view/gap") {
          this.#gaps.hold(event);
          return {
            fold: { kind: "bufferedDuringGap", method: event.method },
            io: NO_IO,
            retirements: []
          };
        }
        const twin = this.#gaps.claimServedTwin(event);
        if (twin !== void 0) {
          return {
            fold: { kind: "ignoredGapOverlap", method: event.method, viewCursor: twin },
            io: NO_IO,
            retirements: []
          };
        }
        const sink = { retirements: [], tasks: [] };
        const outcome = this.#foldAndRoute(event, sink);
        if (outcome.kind === "deliveryGap")
          sink.tasks.push(this.#gaps.start());
        return {
          fold: outcome,
          io: _Session.#settleIo(sink.tasks),
          retirements: sink.retirements
        };
      }
      /** Observe SS4.8 fills that did not complete. See `MuseGapFillError`. */
      onGapError(handler) {
        this.#gaps.onError(handler);
      }
      /**
       * Fold one frame and fan it out to the turn handles that want it.
       *
       * The shared path: `apply` uses it for a live frame, and `GapFiller` uses it
       * to re-feed the paged prefix and the buffered tail. One path is what makes
       * a spliced frame indistinguishable from a live one to everything
       * downstream — the fold, the iterators, and the SS4.13 retirements.
       */
      #foldAndRoute(event, sink) {
        const retirements = [];
        const tasks = sink.tasks;
        const outcome = this.#fold.apply(event);
        if (outcome.kind === "ignoredMissingParams")
          return outcome;
        const known = event;
        switch (known.method) {
          case "item/started":
          case "item/updated":
          case "item/completed":
            if (outcome.kind === "item" && outcome.outcome.kind !== "ignoredStaleRevision") {
              this.#itemFolded(known.params.item, retirements);
            }
            break;
          case "item/delta":
            this.#deltaFolded(known.params);
            break;
          case "turn/started":
            this.#handle(known.params.turnId).markStarted();
            this.#queueMoved(known.params.turnId, tasks);
            break;
          case "turn/completed":
            this.#handle(known.params.turnId).settleCompleted(known.params);
            this.#queueMoved(known.params.turnId, tasks);
            break;
          case "turn/unqueued": {
            this.#handle(known.params.turnId).settleUnqueued(known.params);
            const reclaimed = this.#pending.observedReclaim(known.params.commandId);
            if (reclaimed !== void 0)
              retirements.push(reclaimed);
            break;
          }
          case "approval/requested":
            if (outcome.kind === "approvalPending")
              this.#approvalRequested(known.params, tasks);
            break;
          // Folded, deliberately NOT routed to a turn handle. Listed rather than
          // defaulted so this switch is exhaustive over `ViewEvent`: the fold's
          // `AssertNever` forces each new #206 view notification into that union,
          // and a `default` arm here would swallow the addition silently.
          //
          // `view/gap` is here because it routes to no turn: it names a hole in
          // DELIVERY, so what it moves is the fold's currency, and the recovery
          // it triggers is started by `apply` off the `deliveryGap` verdict rather
          // than from this switch (FR-020 / T032).
          case "view/gap":
          case "turn/retracted":
          // the turn still reaches its own terminal
          case "turn/retryScheduled":
          // non-terminal by contract (SS4.5.1)
          // An UPDATE refreshes a pending approval; it never opens one, and it
          // carries none of the request-shape members (`itemId`, `turnId`,
          // `toolName`) an `ApprovalHandler` is typed on. SS5.6.3: a re-issued
          // REQUEST embodies the refresh, and that is the frame that drives the
          // handler — so calling it from here would either lie about the request
          // or need a second, thinner handler type for one wire event.
          case "approval/updated":
          case "approval/resolved":
          case "userInput/requested":
          case "userInput/settled":
          case "session/modelChanged":
          case "session/goalChanged":
          case "session/todoListChanged":
          case "session/branchChanged":
          case "session/tokenUsage":
          case "session/contextUsage":
          case "session/approvalModeChanged":
            break;
          default: {
            const unrouted = known;
            break;
          }
        }
        if (retirements.length > 0) {
          this.#submit.forgetRetired(retirements);
          sink.retirements.push(...retirements);
        }
        return outcome;
      }
      /** Flatten the event's I/O tasks, or hand back the shared empty. */
      static #settleIo(tasks) {
        if (tasks.length === 0)
          return NO_IO;
        return Promise.all(tasks).then((batches) => batches.flat());
      }
      /**
       * The handle for a turn, created on first mention from either side. A turn
       * the fold has already settled returns its settled handle, so a wait
       * registered late resolves instead of hanging on an event that has passed.
       */
      turn(turnId) {
        const held = this.#turns.get(turnId);
        if (held !== void 0)
          return held;
        const fresh = this.#mint(turnId);
        if (this.#discharge?.kind === "discharged")
          fresh.settleTerminalUnknown();
        else if (this.#deathError !== void 0)
          fresh.fail(this.#deathError);
        return fresh;
      }
      /**
       * A handle minted because a SERVER FRAME named this turn. Never pre-failed,
       * and that is what makes the post-death behaviour ORDER-INDEPENDENT.
       *
       * A durable death does not stop the fold (FM-001), so frames can still
       * arrive for a turn with no handle yet. Pre-failing here made the outcome
       * depend on which frame arrived first: terminal-first settled, started-first
       * pre-failed the handle and first-settlement-wins then dropped the real
       * terminal one frame later — the same server fact, two different answers.
       * That asymmetry is measured against synthetic frames; which order a real
       * host emits after a crash is NOT something this lane has observed, and the
       * rule does not depend on it. A frame arriving IS the connection still speaking,
       * so a handle it mints is not a waiter with no answer coming; `turn()` keeps
       * the latch for the case that genuinely is.
       */
      #handle(turnId) {
        return this.#turns.get(turnId) ?? this.#mint(turnId);
      }
      #mint(turnId) {
        const fresh = new TurnHandle(turnId, () => this.#itemsOfTurn(turnId));
        this.#turns.set(turnId, fresh);
        return fresh;
      }
      /**
       * A host process exited. Classify it, and discharge SS2.13.3b if the profile
       * demands it (tasks.md T030b, FM-002).
       *
       * REPORT EVERY NOTIFICATION OF THE DEATH — the exit promise AND transport
       * EOF. A repeat report of an already-latched death is not a no-op: it marks
       * END OF DRAIN and settles waits the drain minted after the first report.
       * A consumer that dedupes exit notifications and reports the death once
       * leaves those waits pending forever (FM-001).
       *
       * Three outcomes, and the middle one is the one an implementation drops:
       *  - an ORDERLY exit (SS2.11 row 0) is not a death: nothing is discharged
       *    and the session stays usable;
       *  - a DURABLE session's abnormal death reconciles on resume (FM-001), so
       *    the stores are left exactly as observed and only the waiters are told;
       *  - an EPHEMERAL — or unrecognized (SS2.13.1) — session's abnormal death
       *    discharges the obligation in full.
       */
      hostExited(exit) {
        if (this.#discharge !== void 0) {
          this.#sweepUnsettledAfterDrain();
          return this.#discharge;
        }
        const profile = this.#durability;
        if (!isAbnormalHostDeath(exit))
          return { exit, kind: "notADeath", profile };
        if (survivesHostDeath(profile)) {
          const died = new MuseHostDiedError(exit);
          this.#deathError = died;
          for (const handle of this.#turns.values())
            handle.fail(died);
          this.#discharge = { exit, kind: "durableDeath", profile };
          return this.#discharge;
        }
        const retiredCommands = this.#pending.discardEphemeral();
        const terminalUnknownItems = this.#fold.markEphemeralHostDeath(isItemInProgress);
        for (const handle of this.#turns.values())
          handle.settleTerminalUnknown();
        this.#discarded?.sessionIds.add(this.sessionId);
        this.#submit.forgetRetired(retiredCommands);
        this.#discharge = {
          exit,
          kind: "discharged",
          profile,
          retiredCommands,
          terminalUnknownItems
        };
        return this.#discharge;
      }
      /**
       * Settle everything the drain left open. DURABLE ONLY, and `#deathError` is
       * set iff a durable death latched, so the condition is the discriminator.
       *
       * There is deliberately no ephemeral arm: after a discharge the first
       * notification settled every held handle, `apply()` refuses before a frame
       * can mint one, and `turn()` settles a fresh mint on the spot — so no
       * unsettled handle can exist for it to reach. An arm for that state would be
       * untestable defense for something no producer reaches (Constitution XI) and
       * a mutant that survives by construction.
       */
      #sweepUnsettledAfterDrain() {
        if (this.#deathError === void 0)
          return;
        for (const handle of this.#turns.values())
          handle.fail(this.#deathError);
      }
      // ---- FR-018 submit verb (T030 obligation a) -----------------------------
      /**
       * Submit a user turn (tdd SS3.2) and hand back THIS session's handle for the
       * turn the ack named.
       *
       * The returned handle is the one `apply` already routes events to — not a
       * second one minted beside it, which would compare equal on every field and
       * then never receive an item, a delta, or a terminal.
       *
       * The wire shaping, the optimistic SS4.13 entry, and the settle-on-rejection
       * rule all live in `TurnSubmitter`; what is decided HERE is the one thing that
       * needs the fold: the entry's insertion point, which is the last item this
       * session holds at submission time.
       */
      async sendUserTurn(options) {
        const ack = await this.#submit.submit(options, this.#lastFoldedItemId());
        return this.#handle(ack.turnId);
      }
      // ---- FR-019 approval round trip (T031) ----------------------------------
      /** Answer approvals with `handler` (FR-019). See `ApprovalRouter`. */
      onApproval(handler) {
        this.#approvals.onApproval(handler);
      }
      /** Observe round trips that did not complete. See `ApprovalFailure`. */
      onApprovalError(handler) {
        this.#approvals.onApprovalError(handler);
      }
      // ---- consumer-driven SS4.13 retirement verbs ----------------------------
      /**
       * Stop the SS3.1.1 retry loop for one entry and take its input back
       * (SS4.13 "Abandoned").
       *
       * A `Session` method rather than a `pending` view member: the retirement
       * must also prune the submitter's replay memory, or the abandoned command's
       * `turn/start` params live for the session's lifetime — unbounded over the
       * sanctioned submit-then-abandon flow.
       */
      stopRetrying(commandId) {
        const retired = this.#pending.stopRetrying(commandId);
        if (retired !== void 0)
          this.#submit.forgetRetired([retired]);
        return retired;
      }
      /**
       * Feed a consumer-driven replay's answer through the live SS4.13 settlement
       * rules. Wrapped for the same replay-memory bookkeeping as `stopRetrying`;
       * `"held"` means the answer settled nothing and the entry stays.
       */
      replayAnswered(commandId, answer) {
        const settled = this.#pending.replayAnswered(commandId, answer);
        if (settled !== "held")
          this.#submit.forgetRetired([settled]);
        return settled;
      }
      // ---- SS4.13 drivers that need client->server I/O (T030 obligation d) ----
      /**
       * Resolve a snapshot join by performing the I/O its plan demands (SS4.13,
       * SS4.9): same-`commandId` resubmits FIRST, then the replays, then the
       * reclaimed-signature verdict.
       *
       * The order is normative, not incidental: SS4.13 requires an unacked entry be
       * resubmitted "before any retire-to-composer", because a join miss does not
       * prove the intake was never written.
       *
       * `PendingCommandSet.joinSnapshot` stays available on `pending` for a
       * fold-only consumer that performs its own I/O; this verb is for the wired
       * case and therefore requires a connection even when the plan turns out empty.
       */
      async resolveSnapshotJoin(facts) {
        this.#submit.requireConnection("resolveSnapshotJoin");
        const plan = this.#pending.joinSnapshot(facts);
        const out = [...plan.retirements];
        for (const commandId of plan.mustResubmit)
          await this.#submit.driveReplay(commandId, out);
        const queuedCommandIds = facts.queuedTurns.map((queued) => queued.commandId);
        for (const commandId of plan.mustReplay) {
          const answer = await this.#submit.replay(commandId);
          if (answer === void 0)
            continue;
          const settled = this.#pending.resolveReplayAtJoin(commandId, answer, queuedCommandIds);
          if (settled !== "held")
            out.push(settled);
        }
        this.#submit.forgetRetired(out);
        return out;
      }
      /**
       * Resolve a reconnect with NO snapshot (`history.mode: "none"`, the default
       * cursor-resume path). Reconnect itself is the trigger: replay each acked
       * entry once, resubmit each unacked entry's SAME `commandId` once.
       */
      async resolveReconnect() {
        this.#submit.requireConnection("resolveReconnect");
        const plan = this.#pending.reconnectedWithoutSnapshot();
        const out = [];
        for (const commandId of plan.mustResubmit)
          await this.#submit.driveReplay(commandId, out);
        for (const commandId of plan.mustReplay)
          await this.#submit.driveReplay(commandId, out);
        this.#submit.forgetRetired(out);
        return out;
      }
      // ---- event-driven I/O ---------------------------------------------------
      #lastFoldedItemId() {
        const items = this.#fold.items.list();
        return items.length === 0 ? null : items[items.length - 1]?.itemId ?? null;
      }
      /**
       * SS4.13 "Queue movement": a `turn/started` or `turn/completed` for a turn
       * that is not an entry's own decides that entry's fate at a launch boundary,
       * and SS4.3 carries no view event for a command-intake settlement — so the
       * only way to learn it is to replay.
       */
      #queueMoved(turnId, tasks) {
        if (!this.#submit.wired)
          return;
        const commandIds = this.#pending.observedQueueMovement(turnId);
        if (commandIds.length === 0)
          return;
        tasks.push(this.#driveQueueReplays(commandIds));
      }
      async #driveQueueReplays(commandIds) {
        const out = [];
        for (const commandId of commandIds) {
          try {
            await this.#submit.driveReplay(commandId, out);
          } catch {
          }
        }
        this.#submit.forgetRetired(out);
        return out;
      }
      #approvalRequested(params, tasks) {
        const decided = this.#approvals.requested(params);
        if (decided !== void 0)
          tasks.push(decided.then(() => []));
      }
      #itemsOfTurn(turnId) {
        return this.#fold.items.list().filter((item) => item.turnId === turnId);
      }
      #itemFolded(item, retirements) {
        if (item.kind === USER_MESSAGE && item.commandId !== void 0) {
          const materialized = this.#pending.observedUserMessage(item.commandId, item.itemId);
          if (materialized !== void 0)
            retirements.push(materialized);
        }
        const turnId = item.turnId ?? void 0;
        if (turnId != null)
          this.#handle(turnId).pushItem(item);
        const buffered = this.#unattributedDeltas.get(item.itemId);
        if (buffered === void 0)
          return;
        this.#unattributedDeltas.delete(item.itemId);
        if (turnId == null)
          return;
        const handle = this.#handle(turnId);
        for (const params of buffered)
          handle.pushDelta(params);
      }
      #deltaFolded(params) {
        const held = this.#fold.items.get(params.itemId);
        if (held === void 0) {
          const buffered = this.#unattributedDeltas.get(params.itemId);
          if (buffered === void 0)
            this.#unattributedDeltas.set(params.itemId, [params]);
          else
            buffered.push(params);
          return;
        }
        if (held.turnId != null)
          this.#handle(held.turnId).pushDelta(params);
      }
    };
  }
});

// ../../node_modules/@muse-code/sdk/dist/src/facade/client.js
var MuseClient;
var init_client = __esm({
  "../../node_modules/@muse-code/sdk/dist/src/facade/client.js"() {
    init_spawn();
    init_errors();
    init_discarded();
    init_host_death();
    init_session();
    MuseClient = class _MuseClient {
      #connection;
      #durability;
      #discarded;
      /** Sessions this client opened, so one death notification reaches them all. */
      #sessions = /* @__PURE__ */ new Set();
      /** The spawned host, when `spawn` built this client. */
      #child;
      #initializeResult;
      /**
       * Set by `close()` BEFORE the connection is torn down.
       *
       * This flag is the entire discriminator for obligation (b): the same
       * transport EOF is an orderly SS2.1.2 shutdown when we caused it and an
       * abnormal death when we did not, and nothing below this layer can tell.
       */
      #closing = false;
      /** Latched by an abnormal EOF, so a later `resumeSession` can be withheld. */
      #hostDied = false;
      constructor(connection, options) {
        this.#connection = connection;
        this.#durability = options.durability;
        this.#discarded = new DiscardedSessions();
        this.#child = options.host?.child;
        this.#initializeResult = options.host?.initializeResult;
        this.#connection.onNotification((notification) => this.#route(notification));
        void this.#connection.closed.then(() => this.#transportClosed());
      }
      /**
       * Deliver one view notification to the session(s) it names.
       *
       * A frame naming NO session is dropped here rather than fed to every
       * session: `Session.apply` already tolerates unknown methods, but only the
       * frames that name a `sessionId` have an owner to route to. A frame naming
       * an UNKNOWN session is dropped for the same reason — routing it anywhere
       * would trip the foreign-frame throw on a session it does not belong to.
       */
      #route(notification) {
        const named = notification.params?.sessionId;
        if (typeof named !== "string")
          return;
        for (const session of this.#sessions) {
          if (session.sessionId === named)
            session.apply(notification);
        }
      }
      /**
       * Spawn an owned host, run the SS1.4 handshake, and hand back a client whose
       * durability profile came from that handshake (FR-018).
       *
       * The profile is READ rather than asked of the caller, which is the whole
       * reason this factory exists beside the bare constructor: SS2.13.1 makes the
       * absent/unrecognized distinction load-bearing, and a caller re-deriving it
       * by hand is a caller that can get it wrong.
       */
      static async spawn(options) {
        const handshake = spawnMspConnection({
          command: options.museBin,
          ...options.args === void 0 ? {} : { args: options.args },
          ...options.cwd === void 0 ? {} : { cwd: options.cwd },
          ...options.env === void 0 ? {} : { env: options.env },
          ...options.onStderr === void 0 ? {} : { onStderr: options.onStderr },
          ...options.shutdownTimeoutMs === void 0 ? {} : { shutdownTimeoutMs: options.shutdownTimeoutMs }
        });
        let spawned;
        try {
          spawned = await handshake.initialize({
            clientInfo: options.clientInfo,
            ...options.capabilities === void 0 ? {} : { capabilities: options.capabilities }
          });
        } catch (error) {
          await handshake.close().catch(() => void 0);
          throw error;
        }
        return new _MuseClient(spawned.connection, {
          durability: readSessionDurability(spawned.initializeResult),
          host: spawned
        });
      }
      /**
       * The handshake result, when this client was built by `spawn`.
       *
       * A plain `Error`, not a typed one: reading this off a client that was not
       * built by `spawn` is API misuse, not a protocol STATE an embedder branches
       * on — a typed class here would send the SS2.13.3b recovery path chasing a
       * host death that never happened.
       */
      get initializeResult() {
        if (this.#initializeResult === void 0) {
          throw new Error("initializeResult is only available on a client built by MuseClient.spawn");
        }
        return this.#initializeResult;
      }
      /** The host's SS2.11 exit row, when this client was built by `spawn`. */
      get exit() {
        if (this.#child === void 0) {
          throw new Error("exit is only available on a client built by MuseClient.spawn");
        }
        return this.#child.exit;
      }
      /** The durability profile every session this client opens inherits. */
      get durability() {
        return this.#durability;
      }
      /** Open a new root session (tdd SS2.5.1). */
      async startSession(options = {}) {
        const params = {};
        if (options.approvalMode != null)
          params.approvalMode = options.approvalMode;
        if (options.providerId != null)
          params.providerId = options.providerId;
        if (options.sessionId != null)
          params.sessionId = options.sessionId;
        if (options.workspaceRoot != null)
          params.workspaceRoot = options.workspaceRoot;
        if (options.modelId != null)
          params.modelId = options.modelId;
        const raw = await this.#connection.command("session/start", params);
        const result = raw;
        return this.#openSession(result.session.sessionId, {
          result,
          verb: "session/start"
        });
      }
      /**
       * Load an existing session and subscribe this connection to its view
       * (tdd SS2.5.2).
       *
       * WITHHELD after an ephemeral host death (SS2.13.3b clause 2, "do not attempt
       * to reattach"), and refused on THIS side of the transport: a reattach
       * attempt that reaches the wire has already violated the clause, whatever the
       * server answers.
       */
      async resumeSession(options) {
        this.#assertReattachAllowed(options.sessionId);
        const params = { sessionId: options.sessionId };
        if (options.cursor != null)
          params.cursor = options.cursor;
        if (options.excludeItems != null)
          params.excludeItems = options.excludeItems;
        if (options.history != null)
          params.history = options.history;
        const raw = await this.#connection.command("session/resume", params);
        const result = raw;
        return this.#openSession(result.session.sessionId, {
          result,
          verb: "session/resume"
        });
      }
      /**
       * Shut the host down in an orderly way (SS2.1.2); the shutdown this causes
       * is not reported to your sessions as a host death.
       *
       * The EOF this close produces is NOT a death, which is what `#closing`
       * records.
       *
       * `#closing` covers only the EOF; it must not swallow the EXIT ROW. When the
       * host ignores stdin EOF, `#child.close()` escalates to SIGTERM/SIGKILL and
       * the exit classifies as a crash — an abnormal death under SS2.13.3b no
       * matter who started the close, and one no transport event will ever report
       * here because `#closing` already claimed the EOF. So the classification the
       * close itself returns is forwarded to every session: `hostExited` answers
       * `notADeath` for `cleanShutdown`, keeping the orderly arm inert.
       */
      async close() {
        this.#closing = true;
        if (this.#child !== void 0) {
          const exit = await this.#child.close();
          if (isAbnormalHostDeath(exit)) {
            for (const session of this.#sessions)
              session.hostExited(exit);
          }
          return;
        }
        await this.#connection.close();
      }
      #openSession(sessionId, opening) {
        const session = new Session({
          connection: this.#connection,
          discarded: this.#discarded,
          durability: this.#durability,
          opening,
          sessionId
        });
        this.#sessions.add(session);
        return session;
      }
      #assertReattachAllowed(sessionId) {
        if (this.#discarded.sessionIds.has(sessionId)) {
          throw new MuseSessionDiscardedError(`session ${sessionId} was discarded after an ephemeral host death; it cannot be resumed`);
        }
        if (this.#hostDied && !this.#survivesHostDeath()) {
          throw new MuseSessionDiscardedError("this client's ephemeral host died; SS2.13.3b forbids reattaching to it");
        }
      }
      #survivesHostDeath() {
        return this.#durability.kind === "durable";
      }
      /**
       * The transport reached EOF. If this client did not cause it, that is
       * SS2.13.3b's second death notification (T030 obligation b) and every session
       * this client opened discharges through the SAME `Session.hostExited` path
       * the process exit uses — including its latch, so whichever notification
       * arrives second replays the first one's report instead of a half delta.
       */
      #transportClosed() {
        if (this.#closing)
          return;
        this.#hostDied = true;
        for (const session of this.#sessions)
          session.hostExited({ kind: "transportEof" });
      }
    };
  }
});

// ../../node_modules/@muse-code/sdk/dist/src/index.js
var src_exports = {};
__export(src_exports, {
  COMMAND_REJECTED_CODE: () => COMMAND_REJECTED_CODE,
  COMMAND_REJECTED_KIND: () => COMMAND_REJECTED_KIND,
  Connection: () => Connection,
  DiscardedSessions: () => DiscardedSessions,
  EXPECTED_SCHEMA_FINGERPRINT: () => EXPECTED_SCHEMA_FINGERPRINT,
  ItemStore: () => ItemStore,
  MspError: () => MspError,
  MspHandshake: () => MspHandshake,
  MuseClient: () => MuseClient,
  MuseForeignSessionError: () => MuseForeignSessionError,
  MuseGapFillError: () => MuseGapFillError,
  MuseHostDiedError: () => MuseHostDiedError,
  MuseServeChild: () => MuseServeChild,
  MuseSessionDiscardedError: () => MuseSessionDiscardedError,
  PendingCommandSet: () => PendingCommandSet,
  ProtocolError: () => ProtocolError,
  Session: () => Session,
  SessionFold: () => SessionFold,
  SessionStateStore: () => SessionStateStore,
  SpawnedMspConnection: () => SpawnedMspConnection,
  checkServedFingerprint: () => checkServedFingerprint,
  createUuidV7Mint: () => createUuidV7Mint,
  fingerprintMismatchMessage: () => fingerprintMismatchMessage,
  isLaunchFailure: () => isLaunchFailure,
  readSessionDurability: () => readSessionDurability,
  spawnMspConnection: () => spawnMspConnection
});
var init_src = __esm({
  "../../node_modules/@muse-code/sdk/dist/src/index.js"() {
    init_fingerprint();
    init_item_store();
    init_state_store();
    init_session_fold();
    init_pending_command_set();
    init_connection();
    init_spawn();
    init_client();
    init_discarded();
    init_errors();
    init_host_death();
    init_session();
    init_turn_handle();
  }
});

// ../../packages/daemon/dist/src/mspHost.js
var require_mspHost = __commonJS({
  "../../packages/daemon/dist/src/mspHost.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.HeliconMspHost = exports2.SDK_TIER_OFF_EXIT_CODE = exports2.HELICON_CLIENT_NAME = void 0;
    exports2.classifyServeExit = classifyServeExit;
    exports2.serveExitMessage = serveExitMessage;
    var sdk_1 = (init_src(), __toCommonJS(src_exports));
    exports2.HELICON_CLIENT_NAME = "helicon";
    exports2.SDK_TIER_OFF_EXIT_CODE = 5;
    function classifyServeExit(code) {
      if (code === 0) {
        return "clean";
      }
      if (code === exports2.SDK_TIER_OFF_EXIT_CODE) {
        return "sdk-tier-off";
      }
      if (code === null) {
        return "signalled";
      }
      return "error";
    }
    function serveExitMessage(exitClass) {
      switch (exitClass) {
        case "clean":
          return "The Muse host exited cleanly.";
        case "sdk-tier-off":
          return "This Muse build has its experimental SDK tier switched off, so no invocation of that binary will serve. Upgrade the CLI or use a build with MSP serving enabled.";
        case "signalled":
          return "The Muse host was killed by a signal before it reported an exit code.";
        case "error":
          return "The Muse host exited with an error. Check that you are logged in (muse login) and that the workspace is readable.";
      }
    }
    var HeliconMspHost2 = class {
      target;
      spawnFn;
      onStderr;
      handshake = null;
      msp = null;
      constructor(target, spawnFn = sdk_1.spawnMspConnection, onStderr = () => {
      }) {
        this.target = target;
        this.spawnFn = spawnFn;
        this.onStderr = onStderr;
      }
      async start(clientVersion) {
        const onStderr = this.onStderr;
        this.handshake = this.spawnFn({
          command: this.target.command,
          args: this.target.args,
          cwd: this.target.cwd,
          env: this.target.env,
          onStderr: (chunk) => onStderr(String(chunk))
        });
        this.msp = await this.handshake.initialize({
          clientInfo: { name: exports2.HELICON_CLIENT_NAME, version: clientVersion }
        });
        return {
          initializeResult: this.msp.initializeResult,
          fingerprintWarning: this.msp.fingerprintWarning ?? null
        };
      }
      get connection() {
        if (!this.msp) {
          throw new Error("HeliconMspHost: call start() before using the connection.");
        }
        return this.msp.connection;
      }
      async close() {
        if (!this.msp) {
          throw new Error("HeliconMspHost: call start() before close().");
        }
        const exit = await this.msp.close();
        return { code: exit.code, signal: exit.signal };
      }
    };
    exports2.HeliconMspHost = HeliconMspHost2;
  }
});

// ../../packages/daemon/dist/src/sessions.js
var require_sessions = __commonJS({
  "../../packages/daemon/dist/src/sessions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SessionManager = exports2.APPROVAL_MODES = void 0;
    exports2.isApprovalMode = isApprovalMode2;
    exports2.textInput = textInput;
    exports2.APPROVAL_MODES = [
      "allowAll",
      "denyUnmatched",
      "onRequest",
      "promptUnmatched"
    ];
    function isApprovalMode2(value) {
      return typeof value === "string" && exports2.APPROVAL_MODES.includes(value);
    }
    function textInput(text) {
      return [{ type: "text", text }];
    }
    function asRecord2(value) {
      if (typeof value === "object" && value !== null) {
        return value;
      }
      return null;
    }
    function nestedString(value, path) {
      let current = value;
      for (const key of path) {
        const record = asRecord2(current);
        if (!record) {
          return null;
        }
        current = record[key];
      }
      return typeof current === "string" ? current : null;
    }
    function sessionIdOf(result) {
      const id = nestedString(result, ["session", "sessionId"]);
      if (!id) {
        throw new Error("MSP reply carried no session.sessionId.");
      }
      return id;
    }
    function toTurnAck(raw) {
      const record = asRecord2(raw);
      return {
        turnId: record ? nestedString(record, ["turnId"]) : null,
        status: record ? record["status"] : void 0,
        disposition: record ? record["disposition"] : void 0,
        raw
      };
    }
    var SessionManager2 = class {
      connection;
      constructor(connection) {
        this.connection = connection;
      }
      onNotification(handler) {
        this.connection.onNotification(handler);
      }
      async listSessions(workspaceRoot, limit = 50) {
        const params = { limit };
        if (workspaceRoot !== void 0) {
          params["workspaceRoot"] = workspaceRoot;
        }
        const result = await this.connection.command("session/list", params);
        const record = asRecord2(result);
        if (record && Array.isArray(record["sessions"])) {
          return record["sessions"];
        }
        if (Array.isArray(result)) {
          return result;
        }
        return [];
      }
      async startSession(options = {}) {
        const params = {};
        if (options.workspaceRoot !== void 0) {
          params["workspaceRoot"] = options.workspaceRoot;
        }
        if (options.approvalMode !== void 0) {
          params["approvalMode"] = options.approvalMode;
        }
        if (options.modelId !== void 0) {
          params["modelId"] = options.modelId;
        }
        const result = await this.connection.command("session/start", params);
        return { sessionId: sessionIdOf(result), raw: result };
      }
      async resumeSession(sessionId, excludeItems = false) {
        return this.connection.command("session/resume", { sessionId, excludeItems });
      }
      async readSession(sessionId) {
        return this.connection.command("session/read", { sessionId, excludeItems: true });
      }
      async sendTurn(sessionId, text, options = {}) {
        const params = {
          sessionId,
          input: textInput(text)
        };
        if (options.displayText !== void 0) {
          params["displayText"] = options.displayText;
        }
        if (options.ifBusy !== void 0) {
          params["ifBusy"] = options.ifBusy;
        }
        if (options.reasoningEffort !== void 0) {
          params["reasoningEffort"] = options.reasoningEffort;
        }
        return toTurnAck(await this.connection.command("turn/start", params));
      }
      async steerTurn(sessionId, expectedTurnId, text) {
        return this.connection.command("turn/steer", {
          sessionId,
          expectedTurnId,
          input: textInput(text)
        });
      }
      async interruptTurn(sessionId, turnId, retract = false) {
        const params = { sessionId, retract };
        if (turnId !== void 0) {
          params["turnId"] = turnId;
        }
        return this.connection.command("turn/interrupt", params);
      }
      async cancelTurn(sessionId, turnId) {
        return this.connection.command("turn/cancel", { sessionId, turnId });
      }
      async unqueueTurn(sessionId, turnId) {
        return this.connection.command("turn/unqueue", { sessionId, turnId });
      }
      async decideApproval(decision) {
        return this.connection.command("approval/decide", {
          sessionId: decision.sessionId,
          approvalId: decision.approvalId,
          requirementId: decision.requirementId,
          choiceId: decision.choiceId,
          feedback: decision.feedback ?? null
        });
      }
      async listModels(sessionId) {
        const params = {};
        if (sessionId !== void 0) {
          params["sessionId"] = sessionId;
        }
        return this.connection.command("model/list", params);
      }
      async setSessionModel(sessionId, model) {
        return this.connection.command("session/setModel", { sessionId, model });
      }
      async setSessionApprovalMode(sessionId, mode) {
        return this.connection.command("session/setApprovalMode", { sessionId, mode });
      }
      async answerUserInput(sessionId, userInputId, answers) {
        return this.connection.command("userInput/answer", {
          sessionId,
          userInputId,
          answers
        });
      }
    };
    exports2.SessionManager = SessionManager2;
  }
});

// ../../packages/daemon/dist/src/store.js
var require_store = __commonJS({
  "../../packages/daemon/dist/src/store.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.HeliconStore = void 0;
    var node_sqlite_1 = require("node:sqlite");
    function nowIso() {
      return (/* @__PURE__ */ new Date()).toISOString();
    }
    function displayNameFor(cwd) {
      const trimmed = cwd.replace(/[\\/]+$/, "");
      const parts = trimmed.split(/[\\/]/);
      return parts[parts.length - 1] || trimmed;
    }
    var SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cwd TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL DEFAULT 'New session',
  status TEXT NOT NULL DEFAULT 'active',
  turn_count INTEGER NOT NULL DEFAULT 0,
  model_id TEXT,
  origin TEXT NOT NULL DEFAULT 'helicon',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS turns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  status TEXT NOT NULL DEFAULT 'running',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id);
`;
    var HeliconStore2 = class {
      db;
      constructor(path = ":memory:") {
        this.db = new node_sqlite_1.DatabaseSync(path);
        this.db.exec(SCHEMA);
      }
      upsertProject(cwd) {
        const now = nowIso();
        this.db.prepare(`INSERT INTO projects (cwd, display_name, pinned, created_at, updated_at)
         VALUES (?, ?, 0, ?, ?)
         ON CONFLICT(cwd) DO UPDATE SET updated_at = excluded.updated_at`).run(cwd, displayNameFor(cwd), now, now);
        const row = this.db.prepare(`SELECT * FROM projects WHERE cwd = ?`).get(cwd);
        return this.toProject(row);
      }
      listProjects() {
        const rows = this.db.prepare(`SELECT * FROM projects ORDER BY pinned DESC, updated_at DESC`).all();
        return rows.map((row) => this.toProject(row));
      }
      setPinned(cwd, pinned) {
        this.db.prepare(`UPDATE projects SET pinned = ?, updated_at = ? WHERE cwd = ?`).run(pinned ? 1 : 0, nowIso(), cwd);
      }
      recordSession(input) {
        const now = nowIso();
        this.db.prepare(`INSERT INTO sessions (id, project_id, title, status, turn_count, model_id, origin, created_at, updated_at)
         VALUES (?, ?, ?, 'active', 0, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           model_id = excluded.model_id,
           updated_at = excluded.updated_at`).run(input.id, input.projectId, input.title ?? "New session", input.modelId ?? null, input.origin ?? "helicon", now, now);
        return this.getSession(input.id);
      }
      listSessionsByProject(projectId) {
        const rows = this.db.prepare(`SELECT * FROM sessions WHERE project_id = ? ORDER BY updated_at DESC`).all(projectId);
        return rows.map((row) => this.toSession(row));
      }
      recordTurn(id, sessionId) {
        const now = nowIso();
        this.db.prepare(`INSERT INTO turns (id, session_id, status, created_at, updated_at)
         VALUES (?, ?, 'running', ?, ?)
         ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at`).run(id, sessionId, now, now);
        this.db.prepare(`UPDATE sessions SET turn_count = turn_count + 1, updated_at = ? WHERE id = ?`).run(now, sessionId);
        return this.getTurn(id);
      }
      updateTurnStatus(id, status) {
        this.db.prepare(`UPDATE turns SET status = ?, updated_at = ? WHERE id = ?`).run(status, nowIso(), id);
      }
      close() {
        this.db.close();
      }
      getSession(id) {
        const row = this.db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id);
        if (!row) {
          throw new Error(`HeliconStore: unknown session ${id}.`);
        }
        return this.toSession(row);
      }
      getTurn(id) {
        const row = this.db.prepare(`SELECT * FROM turns WHERE id = ?`).get(id);
        if (!row) {
          throw new Error(`HeliconStore: unknown turn ${id}.`);
        }
        return {
          id: String(row["id"]),
          sessionId: String(row["session_id"]),
          status: String(row["status"]),
          createdAt: String(row["created_at"]),
          updatedAt: String(row["updated_at"])
        };
      }
      toProject(row) {
        return {
          id: Number(row["id"]),
          cwd: String(row["cwd"]),
          displayName: String(row["display_name"]),
          pinned: Number(row["pinned"]) === 1,
          createdAt: String(row["created_at"]),
          updatedAt: String(row["updated_at"])
        };
      }
      toSession(row) {
        return {
          id: String(row["id"]),
          projectId: Number(row["project_id"]),
          title: String(row["title"]),
          status: String(row["status"]),
          turnCount: Number(row["turn_count"]),
          modelId: row["model_id"] === null ? null : String(row["model_id"]),
          origin: String(row["origin"]),
          createdAt: String(row["created_at"]),
          updatedAt: String(row["updated_at"])
        };
      }
    };
    exports2.HeliconStore = HeliconStore2;
  }
});

// ../../packages/daemon/dist/src/wsl.js
var require_wsl = __commonJS({
  "../../packages/daemon/dist/src/wsl.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.decodeCliOutput = decodeCliOutput;
    exports2.defaultExec = defaultExec2;
    exports2.parseWslList = parseWslList;
    exports2.defaultDistro = defaultDistro;
    exports2.toWslPath = toWslPath;
    exports2.toWindowsPath = toWindowsPath;
    exports2.resolveMuseInDistro = resolveMuseInDistro2;
    exports2.planServe = planServe2;
    exports2.probeEnvironment = probeEnvironment2;
    var node_child_process_1 = require("node:child_process");
    var node_util_1 = require("node:util");
    var execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
    function decodeCliOutput(raw) {
      let text;
      if (raw.length >= 2 && raw[0] === 255 && raw[1] === 254) {
        text = raw.toString("utf16le");
      } else {
        text = raw.toString("utf8");
      }
      return text.replace(/\0/g, "").replace(/\r\n/g, "\n");
    }
    async function defaultExec2(command, args) {
      try {
        const { stdout } = await execFileAsync(command, args, {
          encoding: "buffer",
          windowsHide: true,
          timeout: 3e4
        });
        return { stdout: decodeCliOutput(stdout), exitCode: 0 };
      } catch (error) {
        const code = typeof error.code === "number" ? error.code : 1;
        const stdout = error.stdout;
        return {
          stdout: Buffer.isBuffer(stdout) ? decodeCliOutput(stdout) : "",
          exitCode: code
        };
      }
    }
    function parseWslList(output) {
      const distros = [];
      for (const line of output.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || /^name\s+state\s+version/i.test(trimmed)) {
          continue;
        }
        const match = trimmed.match(/^(\*?)\s*(\S+)\s+(\S+)\s+(\S+)/);
        if (!match) {
          continue;
        }
        distros.push({
          name: match[2],
          isDefault: match[1] === "*",
          state: match[3],
          version: Number.parseInt(match[4], 10) || 0
        });
      }
      return distros;
    }
    function defaultDistro(distros) {
      return distros.find((d) => d.isDefault) ?? distros[0] ?? null;
    }
    function toWslPath(windowsPath) {
      const match = windowsPath.match(/^([A-Za-z]):[\\/]+(.*)$/);
      if (!match) {
        throw new Error(`Cannot map to WSL: not an absolute Windows path: ${windowsPath}.`);
      }
      const drive = match[1].toLowerCase();
      const rest = match[2].replace(/[\\/]+/g, "/");
      return `/mnt/${drive}/${rest}`;
    }
    function toWindowsPath(wslPath) {
      const match = wslPath.match(/^\/mnt\/([a-z])\/(.*)$/);
      if (!match) {
        throw new Error(`Cannot map to Windows: not a /mnt/<drive> path: ${wslPath}.`);
      }
      const drive = match[1].toUpperCase();
      const rest = match[2].replace(/\//g, "\\");
      return `${drive}:\\${rest}`;
    }
    async function resolveMuseInDistro2(exec, distro) {
      const result = await exec("wsl", [
        "-d",
        distro,
        "--",
        "sh",
        "-lc",
        "command -v muse"
      ]);
      if (result.exitCode !== 0) {
        return null;
      }
      const firstLine = result.stdout.split("\n").map((line) => line.trim()).find((line) => line.length > 0);
      return firstLine ?? null;
    }
    function planServe2(options) {
      const platform = options.platform ?? process.platform;
      if (platform === "win32") {
        const distro = options.distro ?? "Ubuntu";
        if (options.musePath) {
          return {
            command: "wsl",
            args: ["-d", distro, "--", options.musePath, "serve"],
            cwd: options.cwd,
            viaWsl: true,
            distro
          };
        }
        return {
          command: "wsl",
          args: ["-d", distro, "--", "sh", "-lc", "muse serve"],
          cwd: options.cwd,
          viaWsl: true,
          distro
        };
      }
      return {
        command: options.musePath ?? "muse",
        args: ["serve"],
        cwd: options.cwd,
        viaWsl: false,
        distro: null
      };
    }
    async function probeEnvironment2(exec = defaultExec2, platform = process.platform) {
      if (platform !== "win32") {
        const found = await exec("sh", ["-lc", "command -v muse"]);
        const musePath2 = found.exitCode === 0 ? found.stdout.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? null : null;
        return { platform, wslAvailable: false, distros: [], defaultDistro: null, musePath: musePath2 };
      }
      const listed = await exec("wsl", ["-l", "-v"]);
      if (listed.exitCode !== 0) {
        return { platform, wslAvailable: false, distros: [], defaultDistro: null, musePath: null };
      }
      const distros = parseWslList(listed.stdout);
      const def = defaultDistro(distros);
      const musePath = def ? await resolveMuseInDistro2(exec, def.name) : null;
      return {
        platform,
        wslAvailable: true,
        distros,
        defaultDistro: def ? def.name : null,
        musePath
      };
    }
  }
});

// ../../packages/daemon/dist/src/index.js
var require_src = __commonJS({
  "../../packages/daemon/dist/src/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    __exportStar(require_mspHost(), exports2);
    __exportStar(require_sessions(), exports2);
    __exportStar(require_store(), exports2);
    __exportStar(require_wsl(), exports2);
  }
});

// ../../packages/server/src/server.ts
var server_exports = {};
__export(server_exports, {
  HELICON_VERSION: () => HELICON_VERSION,
  HeliconServer: () => HeliconServer,
  resolveMuseInDistro: () => import_daemon.resolveMuseInDistro,
  resolveMusePath: () => resolveMusePath
});
function asRecord(value) {
  if (typeof value === "object" && value !== null) {
    return value;
  }
  return null;
}
function str(value) {
  return typeof value === "string" ? value : null;
}
function firstString(record, keys) {
  for (const key of keys) {
    const found = str(record[key]);
    if (found) {
      return found;
    }
  }
  return null;
}
async function resolveMusePath(platform, distro) {
  if (platform === "win32") {
    const probe = await (0, import_daemon.probeEnvironment)(import_daemon.defaultExec, platform);
    return probe.musePath;
  }
  const found = await (0, import_daemon.defaultExec)("sh", ["-lc", "command -v muse"]);
  if (found.exitCode !== 0) {
    return null;
  }
  return found.stdout.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? null;
}
var import_node_http, import_promises, import_node_path, import_daemon, HELICON_VERSION, realHostFactory, MIME, HeliconServer;
var init_server = __esm({
  "../../packages/server/src/server.ts"() {
    "use strict";
    import_node_http = require("node:http");
    import_promises = require("node:fs/promises");
    import_node_path = require("node:path");
    import_daemon = __toESM(require_src());
    HELICON_VERSION = "0.1.0";
    realHostFactory = (target) => new import_daemon.HeliconMspHost(target);
    MIME = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".ico": "image/x-icon",
      ".map": "application/json; charset=utf-8"
    };
    HeliconServer = class {
      server;
      store;
      hosts = /* @__PURE__ */ new Map();
      sinks = /* @__PURE__ */ new Set();
      options;
      constructor(options = {}) {
        this.options = {
          port: options.port ?? 3127,
          host: options.host ?? "127.0.0.1",
          dataDir: options.dataDir ?? ":memory:",
          staticDir: options.staticDir ? (0, import_node_path.resolve)(options.staticDir) : null,
          token: options.token ?? null,
          platform: options.platform ?? process.platform,
          distro: options.distro,
          musePath: options.musePath,
          hostFactory: options.hostFactory ?? realHostFactory
        };
        this.store = new import_daemon.HeliconStore(
          this.options.dataDir === ":memory:" ? ":memory:" : (0, import_node_path.join)(this.options.dataDir, "helicon.db")
        );
        this.server = (0, import_node_http.createServer)((req, res) => {
          void this.route(req, res).catch((error) => this.fail(res, 500, String(error)));
        });
      }
      async listen() {
        await new Promise((resolve2) => this.server.listen(this.options.port, this.options.host, resolve2));
        const address = this.server.address();
        const port = typeof address === "object" && address ? address.port : this.options.port;
        return { port, host: this.options.host };
      }
      async close() {
        for (const sink of [...this.sinks]) {
          this.sinks.delete(sink);
        }
        for (const managed of this.hosts.values()) {
          try {
            await managed.handle.close();
          } catch {
          }
        }
        this.hosts.clear();
        await new Promise(
          (resolve2, reject) => this.server.close((error) => error ? reject(error) : resolve2())
        );
        this.store.close();
      }
      emit(type, data) {
        for (const sink of this.sinks) {
          try {
            sink(type, data);
          } catch {
          }
        }
      }
      authorized(req) {
        if (!this.options.token) {
          return true;
        }
        const url = new URL(req.url ?? "/", "http://localhost");
        if (url.searchParams.get("token") === this.options.token) {
          return true;
        }
        const header = req.headers["authorization"];
        return header === `Bearer ${this.options.token}`;
      }
      json(res, status, body) {
        const text = JSON.stringify(body);
        res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
        res.end(text);
      }
      fail(res, status, message) {
        if (!res.headersSent) {
          this.json(res, status, { error: message });
        } else {
          res.end();
        }
      }
      async readBody(req) {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const text = Buffer.concat(chunks).toString("utf8").trim();
        if (!text) {
          return {};
        }
        return JSON.parse(text);
      }
      async route(req, res) {
        const url = new URL(req.url ?? "/", "http://localhost");
        const path = url.pathname;
        if (!this.authorized(req)) {
          this.fail(res, 401, "Missing or invalid token.");
          return;
        }
        const method = (req.method ?? "GET").toUpperCase();
        if (method === "GET" && path === "/api/health") {
          this.json(res, 200, { ok: true, version: HELICON_VERSION });
          return;
        }
        if (method === "GET" && path === "/api/env") {
          const probe = await (0, import_daemon.probeEnvironment)(import_daemon.defaultExec, this.options.platform);
          this.json(res, 200, {
            platform: probe.platform,
            wslAvailable: probe.wslAvailable,
            defaultDistro: probe.defaultDistro,
            museFound: probe.musePath !== null,
            musePath: probe.musePath
          });
          return;
        }
        if (method === "GET" && path === "/api/events") {
          this.serveEvents(res);
          return;
        }
        if (method === "GET" && path === "/api/projects") {
          this.json(res, 200, { projects: this.store.listProjects() });
          return;
        }
        if (method === "PATCH" && path === "/api/projects/pin") {
          const body = asRecord(await this.readBody(req));
          const cwd = body ? str(body["cwd"]) : null;
          if (!cwd) {
            this.fail(res, 400, "cwd is required.");
            return;
          }
          this.store.upsertProject(cwd);
          this.store.setPinned(cwd, body?.["pinned"] === true);
          this.json(res, 200, { ok: true });
          return;
        }
        if (method === "GET" && path === "/api/sessions") {
          const cwd = url.searchParams.get("cwd");
          if (cwd) {
            const project = this.store.upsertProject(cwd);
            this.json(res, 200, { sessions: this.store.listSessionsByProject(project.id) });
          } else {
            const all = this.store.listProjects().flatMap((p) => this.store.listSessionsByProject(p.id));
            this.json(res, 200, { sessions: all });
          }
          return;
        }
        if (method === "POST" && path === "/api/discover") {
          const body = asRecord(await this.readBody(req));
          const cwd = body ? str(body["cwd"]) ?? void 0 : void 0;
          const found = await this.discover(cwd);
          this.json(res, 200, { sessions: found });
          return;
        }
        if (method === "POST" && path === "/api/sessions") {
          const body = asRecord(await this.readBody(req)) ?? {};
          const cwd = str(body["cwd"]);
          if (!cwd) {
            this.fail(res, 400, "cwd is required.");
            return;
          }
          const mode = body["approvalMode"];
          if (mode !== void 0 && !(0, import_daemon.isApprovalMode)(mode)) {
            this.fail(res, 400, "Unknown approvalMode.");
            return;
          }
          const project = this.store.upsertProject(cwd);
          const manager = await this.managerFor(cwd);
          const started = await manager.startSession({
            workspaceRoot: cwd,
            approvalMode: mode === void 0 ? void 0 : mode,
            modelId: str(body["modelId"]) ?? void 0
          });
          const sessionId = started.sessionId;
          const known = this.knownSessionIds();
          const record = this.store.recordSession({
            id: sessionId,
            projectId: project.id,
            origin: known.has(sessionId) ? "tui" : "helicon"
          });
          this.json(res, 200, { session: this.toSessionView(record, cwd) });
          return;
        }
        const sessionMatch = path.match(/^\/api\/sessions\/([^/]+)\/(resume|read|model|approval-mode)$/);
        if (method === "POST" && sessionMatch) {
          const sessionId = decodeURIComponent(sessionMatch[1]);
          const action = sessionMatch[2];
          const body = asRecord(await this.readBody(req)) ?? {};
          const stored = this.findSession(sessionId);
          const manager = await this.managerFor(stored?.cwd ?? "");
          if (action === "resume") {
            const resumed = await manager.resumeSession(sessionId, body["excludeItems"] === true);
            this.json(res, 200, { resumed });
            return;
          }
          if (action === "read") {
            this.json(res, 200, { session: await manager.readSession(sessionId) });
            return;
          }
          if (action === "model") {
            if (!("model" in body)) {
              this.fail(res, 400, "model is required.");
              return;
            }
            await manager.setSessionModel(sessionId, body["model"]);
            this.json(res, 200, { ok: true });
            return;
          }
          const mode = body["mode"];
          if (!(0, import_daemon.isApprovalMode)(mode)) {
            this.fail(res, 400, "Unknown mode.");
            return;
          }
          await manager.setSessionApprovalMode(sessionId, mode);
          this.json(res, 200, { ok: true });
          return;
        }
        if (method === "POST" && path === "/api/turns") {
          const body = asRecord(await this.readBody(req)) ?? {};
          const sessionId = str(body["sessionId"]);
          const text = str(body["text"]);
          if (!sessionId || !text) {
            this.fail(res, 400, "sessionId and text are required.");
            return;
          }
          const manager = await this.managerFor(this.findSession(sessionId)?.cwd ?? "");
          const ack = await manager.sendTurn(sessionId, text, {
            displayText: str(body["displayText"]) ?? void 0,
            ifBusy: str(body["ifBusy"]) ?? void 0,
            reasoningEffort: str(body["reasoningEffort"]) ?? void 0
          });
          if (ack.turnId) {
            this.safeRecordTurn(sessionId, ack.turnId);
          }
          this.json(res, 200, { turnId: ack.turnId, status: ack.status, disposition: ack.disposition });
          return;
        }
        const turnMatch = path.match(/^\/api\/turns\/(steer|interrupt|cancel|unqueue)$/);
        if (method === "POST" && turnMatch) {
          const action = turnMatch[1];
          const body = asRecord(await this.readBody(req)) ?? {};
          const sessionId = str(body["sessionId"]);
          const turnId = str(body["turnId"]);
          if (!sessionId) {
            this.fail(res, 400, "sessionId is required.");
            return;
          }
          const manager = await this.managerFor(this.findSession(sessionId)?.cwd ?? "");
          if (action === "steer") {
            const text = str(body["text"]);
            if (!turnId || !text) {
              this.fail(res, 400, "turnId and text are required to steer.");
              return;
            }
            await manager.steerTurn(sessionId, turnId, text);
          } else if (action === "interrupt") {
            await manager.interruptTurn(sessionId, turnId ?? void 0, body["retract"] === true);
          } else if (action === "cancel") {
            if (!turnId) {
              this.fail(res, 400, "turnId is required.");
              return;
            }
            await manager.cancelTurn(sessionId, turnId);
          } else {
            if (!turnId) {
              this.fail(res, 400, "turnId is required.");
              return;
            }
            await manager.unqueueTurn(sessionId, turnId);
          }
          this.json(res, 200, { ok: true });
          return;
        }
        if (method === "POST" && path === "/api/approvals/decide") {
          const body = asRecord(await this.readBody(req)) ?? {};
          const sessionId = str(body["sessionId"]);
          const approvalId = str(body["approvalId"]);
          const choiceId = str(body["choiceId"]);
          if (!sessionId || !approvalId || !choiceId || !("requirementId" in body)) {
            this.fail(res, 400, "sessionId, approvalId, requirementId and choiceId are required.");
            return;
          }
          const manager = await this.managerFor(this.findSession(sessionId)?.cwd ?? "");
          await manager.decideApproval({
            sessionId,
            approvalId,
            requirementId: body["requirementId"],
            choiceId,
            feedback: str(body["feedback"])
          });
          this.json(res, 200, { ok: true });
          return;
        }
        if (method === "GET" && path === "/api/models") {
          const sessionId = url.searchParams.get("sessionId") ?? void 0;
          const manager = await this.managerFor(
            (sessionId ? this.findSession(sessionId)?.cwd : void 0) ?? ""
          );
          this.json(res, 200, { models: await manager.listModels(sessionId) });
          return;
        }
        if (method === "POST" && path === "/api/user-input/answer") {
          const body = asRecord(await this.readBody(req)) ?? {};
          const sessionId = str(body["sessionId"]);
          const userInputId = str(body["userInputId"]);
          const answers = body["answers"];
          if (!sessionId || !userInputId || !Array.isArray(answers)) {
            this.fail(res, 400, "sessionId, userInputId and answers are required.");
            return;
          }
          const manager = await this.managerFor(this.findSession(sessionId)?.cwd ?? "");
          await manager.answerUserInput(sessionId, userInputId, answers);
          this.json(res, 200, { ok: true });
          return;
        }
        if (this.options.staticDir && method === "GET") {
          const served = await this.serveStatic(path, res);
          if (served) {
            return;
          }
        }
        this.fail(res, 404, "Not found.");
      }
      serveEvents(res) {
        res.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive"
        });
        const sink = (event, data) => {
          if (res.writableEnded) {
            this.sinks.delete(sink);
            return;
          }
          res.write(`event: ${event}
data: ${JSON.stringify(data)}

`);
        };
        this.sinks.add(sink);
        const heartbeat = setInterval(() => {
          if (res.writableEnded) {
            clearInterval(heartbeat);
            this.sinks.delete(sink);
            return;
          }
          res.write(": ping\n\n");
        }, 25e3);
        res.on("close", () => {
          clearInterval(heartbeat);
          this.sinks.delete(sink);
        });
      }
      async serveStatic(path, res) {
        if (!this.options.staticDir) {
          return false;
        }
        const root = this.options.staticDir;
        const rel = path === "/" ? "/index.html" : path;
        const full = (0, import_node_path.normalize)((0, import_node_path.join)(root, rel));
        if (!full.startsWith(root + import_node_path.sep) && full !== root) {
          return false;
        }
        try {
          const info = await (0, import_promises.stat)(full);
          const file = info.isDirectory() ? (0, import_node_path.join)(full, "index.html") : full;
          const body = await (0, import_promises.readFile)(file);
          res.writeHead(200, { "content-type": MIME[(0, import_node_path.extname)(file)] ?? "application/octet-stream" });
          res.end(body);
          return true;
        } catch {
          return false;
        }
      }
      knownSessionIds() {
        const ids = /* @__PURE__ */ new Set();
        for (const project of this.store.listProjects()) {
          for (const session of this.store.listSessionsByProject(project.id)) {
            ids.add(session.id);
          }
        }
        return ids;
      }
      findSession(sessionId) {
        for (const project of this.store.listProjects()) {
          const match = this.store.listSessionsByProject(project.id).find((s) => s.id === sessionId);
          if (match) {
            return { cwd: project.cwd };
          }
        }
        return null;
      }
      safeRecordTurn(sessionId, turnId) {
        try {
          this.store.recordTurn(turnId, sessionId);
        } catch {
        }
      }
      toSessionView(record, cwd) {
        return {
          sessionId: record.id,
          cwd,
          title: record.title,
          status: record.status,
          turnCount: record.turnCount,
          modelId: record.modelId,
          origin: record.origin
        };
      }
      async discover(cwd) {
        const manager = await this.managerFor(cwd ?? "");
        const remote = await manager.listSessions(cwd);
        const known = this.knownSessionIds();
        const views = [];
        for (const item of remote) {
          const record = asRecord(item);
          const session = record && asRecord(record["session"]);
          const sessionId = session && str(session["sessionId"]) || record && str(record["sessionId"]);
          if (!sessionId) {
            continue;
          }
          const root = session && str(session["workspaceRoot"]) || record && str(record["workspaceRoot"]) || cwd || "";
          if (!root) {
            continue;
          }
          const project = this.store.upsertProject(root);
          const title = session && firstString(session, ["title", "name"]) || record && firstString(record, ["title", "name"]) || "Session";
          const stored = this.store.recordSession({
            id: sessionId,
            projectId: project.id,
            title: known.has(sessionId) ? this.store.listSessionsByProject(project.id).find((s) => s.id === sessionId)?.title ?? title : title,
            origin: known.has(sessionId) ? "helicon" : "tui"
          });
          views.push(this.toSessionView(stored, root));
          known.add(sessionId);
        }
        this.emit("sessions-changed", { cwd: cwd ?? null });
        return views;
      }
      async managerFor(cwd) {
        const key = cwd || "__default__";
        const existing = this.hosts.get(key);
        if (existing) {
          return existing.manager;
        }
        const target = await this.serveTargetFor(cwd);
        const handle = this.options.hostFactory(target);
        await handle.start(HELICON_VERSION);
        const manager = new import_daemon.SessionManager(handle.connection);
        manager.onNotification((notification) => this.forward(notification));
        this.hosts.set(key, { target, handle, manager, started: true });
        return manager;
      }
      async serveTargetFor(cwd) {
        if (this.options.platform !== "win32") {
          return { command: this.options.musePath ?? "muse", args: ["serve"], cwd };
        }
        let musePath = this.options.musePath ?? null;
        if (!musePath) {
          const probe = await (0, import_daemon.probeEnvironment)(import_daemon.defaultExec, "win32");
          musePath = probe.musePath;
        } else if (!musePath.includes("/") && !musePath.includes("\\")) {
          const probe = await (0, import_daemon.probeEnvironment)(import_daemon.defaultExec, "win32");
          musePath = probe.musePath;
        }
        const plan = (0, import_daemon.planServe)({
          platform: "win32",
          distro: this.options.distro ?? "Ubuntu",
          musePath,
          cwd
        });
        return { command: plan.command, args: plan.args, cwd: plan.cwd };
      }
      forward(notification) {
        const params = asRecord(notification.params) ?? {};
        const sessionId = str(params["sessionId"]);
        switch (notification.method) {
          case "item/delta": {
            const itemId = str(params["itemId"]) ?? "";
            const text = str(params["text"]) ?? str(params["delta"]) ?? "";
            this.emit("helicon", {
              type: "delta",
              sessionId,
              itemId,
              kind: str(params["kind"]) ?? "message",
              text
            });
            break;
          }
          case "item/started": {
            this.emit("helicon", {
              type: "delta",
              sessionId,
              itemId: str(params["itemId"]) ?? "",
              kind: str(params["kind"]) ?? "message",
              text: ""
            });
            break;
          }
          case "item/completed": {
            this.emit("helicon", {
              type: "item-final",
              sessionId,
              itemId: str(params["itemId"]) ?? "",
              kind: str(params["kind"]) ?? "message",
              text: str(params["text"]) ?? ""
            });
            break;
          }
          case "turn/completed": {
            this.emit("helicon", {
              type: "turn-terminal",
              sessionId,
              turnId: str(params["turnId"]) ?? "",
              terminal: str(params["terminal"]) ?? "completed"
            });
            break;
          }
          case "approval/requested": {
            const view = this.toApprovalView(sessionId ?? "", params);
            if (view) {
              this.emit("helicon", { type: "approval", approval: view });
            }
            break;
          }
          case "approval/resolved": {
            const approvalId = str(params["approvalId"]);
            if (approvalId) {
              this.emit("helicon", { type: "approval-resolved", approvalId });
            }
            break;
          }
          case "userInput/requested": {
            const view = this.toUserInputView(sessionId ?? "", params);
            if (view) {
              this.emit("helicon", { type: "user-input", prompt: view });
            }
            break;
          }
          default:
            break;
        }
      }
      toApprovalView(sessionId, params) {
        const approvalId = str(params["approvalId"]);
        if (!approvalId) {
          return null;
        }
        const rawChoices = Array.isArray(params["availableChoices"]) ? params["availableChoices"] : [];
        const choices = rawChoices.map((choice, index) => {
          const record = asRecord(choice) ?? {};
          const choiceId = str(record["choiceId"]) ?? str(record["id"]) ?? `choice-${index}`;
          return {
            choiceId,
            label: firstString(record, ["label", "title", "name"]) ?? choiceId,
            acceptsFeedback: record["acceptsFeedback"] === true
          };
        });
        return {
          approvalId,
          sessionId,
          requirementId: params["currentRequirementId"] ?? params["requirementId"] ?? null,
          subject: firstString(params, ["subject", "title", "summary", "description"]) ?? `Approval ${approvalId}`,
          choices
        };
      }
      toUserInputView(sessionId, params) {
        const userInputId = str(params["userInputId"]) ?? str(params["id"]);
        if (!userInputId) {
          return null;
        }
        const rawQuestions = Array.isArray(params["questions"]) ? params["questions"] : [];
        const questions = rawQuestions.map((question) => {
          const record = asRecord(question) ?? {};
          const options = Array.isArray(record["options"]) ? record["options"].map((o) => {
            const option = asRecord(o);
            return str(option?.["label"] ?? o) ?? "";
          }) : [];
          return {
            questionId: str(record["questionId"]) ?? "",
            prompt: firstString(record, ["prompt", "question", "text"]) ?? "",
            mode: str(record["mode"]) ?? "freeText",
            options
          };
        });
        return { userInputId, sessionId, questions };
      }
    };
  }
});

// ../../packages/server/src/cli.ts
function usage() {
  return [
    "helicon-server: local bridge between the Helicon UI and Muse MSP hosts.",
    "",
    "Options:",
    "  --port <n>        HTTP port (default 3127, 0 picks a free port)",
    "  --host <addr>     bind address (default 127.0.0.1)",
    "  --data-dir <dir>  sqlite directory, or :memory: (default)",
    "  --static <dir>    serve a built frontend from this directory",
    "  --token <value>   require a token for non-loopback access",
    "  --distro <name>   WSL distro for muse on Windows (default Ubuntu)",
    "  --muse <path>     explicit muse binary path"
  ].join("\n");
}
function flagValue(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1 || index + 1 >= argv.length) {
    return null;
  }
  return argv[index + 1];
}
async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(usage() + "\n");
    return;
  }
  const { HeliconServer: HeliconServer2 } = await Promise.resolve().then(() => (init_server(), server_exports));
  const portRaw = flagValue(argv, "--port");
  const server = new HeliconServer2({
    port: portRaw ? Number.parseInt(portRaw, 10) : 3127,
    host: flagValue(argv, "--host") ?? "127.0.0.1",
    dataDir: flagValue(argv, "--data-dir") ?? ":memory:",
    staticDir: flagValue(argv, "--static"),
    token: flagValue(argv, "--token"),
    distro: flagValue(argv, "--distro") ?? void 0,
    musePath: flagValue(argv, "--muse") ?? void 0
  });
  const bound = await server.listen();
  process.stdout.write(`helicon-server listening on http://${bound.host}:${bound.port}
`);
  const shutdown = () => {
    void server.close().then(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
void main().catch((error) => {
  process.stderr.write(`helicon-server failed: ${String(error)}
`);
  process.exit(1);
});
