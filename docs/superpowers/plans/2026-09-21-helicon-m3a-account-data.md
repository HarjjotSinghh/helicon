# Helicon M3a - account data and wire Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Carry the account a session and a project belong to out to the client, expose the account list and a per-account plan meter, and add the client methods the M3b UI will consume. No visual components; with no profiles configured Helicon looks and behaves exactly as today.

**Architecture:** The server's single `planUsage` becomes a per-account map fed by `forward(hostKey, ...)` looking up the emitting host's `accountId`, while the legacy `{ usage }` field stays for the default login. `SessionSummary` gains `accountId` and `ProjectView` gains `defaultAccountId`, both from the M2 store columns. `GET /api/accounts` (already built in M2) plus new `startSession({ accountId })` and account mutation methods land on `HeliconClient` and all four of its implementations. aonia's `profiles.json` stays the source of truth for the account list.

**Tech Stack:** TypeScript, Node 22+, `@helicon/server` + `@helicon/daemon` + `@helicon/ui` + `@helicon/web` (npm workspaces), `@harjjotsinghh/aonia`, `node:test`. The M2 plumbing (account columns, host key per account, `/api/accounts` routes) is merged on `prod` as `ab26ea0`.

**Spec:** GitHub issue HarjjotSinghh/helicon#45 "### 2. Helicon" (P4 usage map) and "### Then, in Helicon" P4. UI seam code is quoted in the controller's context for each task; the reviewer templates are the sandbox/plan-usage patterns already in the files.

## Global Constraints

- Branch `feat/accounts-m3a` off `prod`; open a PR at the end, never push to `prod`. Two other agents push to `prod`; re-grep every anchor before editing. Anchors here are from `prod` @ `ab26ea0`: `planUsage` field `server.ts:634`, `GET /api/projects` `:978`, `GET /api/plan-usage` `:1327`, `summary()` `:1771`; `forward`/`observeUsage`/`readPlanUsage` are near the end of the file (grep them, do not trust a line number).
- Default behaviour unchanged with no profiles: every session's `accountId` and every project's `defaultAccountId` is `null`, `GET /api/plan-usage` still returns `{ usage }` for the default login, and the existing single-meter UI keeps working. New fields are additive and nullable.
- Backward-compatible wire: `GET /api/plan-usage` returns `{ usage, byAccount }` where `usage` is the newest across all hosts (today's value) and `byAccount` is `{ [accountId]: PlanUsage }` for hosts that carry an account. The `plan-usage` event gains an optional `accountId`.
- Never read, copy, or log a credential. Helicon only calls aonia's non-secret methods. The account list from `GET /api/accounts` is `{ accounts: [{ id, name, hasLogin, email, lastUsedAt }] }` (built in M2).
- No visual components in M3a. Do not add or change any `.tsx` rendering (Settings, Composer, Sidebar, Home, PlanMeter, UsagePage). M3a touches: `packages/server/src/server.ts`, `packages/daemon/src/sessions.ts` (usage parse only if needed), `packages/ui/src/types.ts`, `packages/ui/src/client.ts`, `packages/ui/src/model/store.ts`, `packages/ui/src/model/controller.ts`, `apps/web/src/webClient.ts`, `packages/ui/test/controller.test.ts`, `landing/src/demo/client.ts`, and the generated `landing/src/product/*` (via the sync script), plus the four test files.
- Every new `HeliconClient` method must be implemented in all four: `WebHeliconClient` (`apps/web/src/webClient.ts`), the test `FakeClient` (`packages/ui/test/controller.test.ts`), the `DemoClient` (`landing/src/demo/client.ts`), and kept in step in `landing/src/product/client.ts` by running `node landing/scripts/sync-product-ui.mjs` after the `packages/ui` changes (this is what commit `27878ba` did for the sandbox switch). A missing implementation fails the web or landing build.
- Plain ASCII in code, comments, strings, commit messages. Commit subjects sentence case, no conventional-commit prefix. No em dashes or unicode.
- Every task ends green: `npm run build --workspace @helicon/daemon --workspace @helicon/ui --workspace @helicon/server` then `npm run test --workspace @helicon/daemon --workspace @helicon/ui --workspace @helicon/server`, and `npm run build --workspace @helicon/web && npm run test --workspace @helicon/web`. The landing build (`npm run build` in `landing/`) is only required in the last task.

## File structure

```
packages/server/src/server.ts       summary() +accountId, /api/projects +defaultAccountId, per-account planUsage map, /api/plan-usage byAccount, plan-usage event accountId
packages/server/test/server.test.ts server tests
packages/ui/src/types.ts            SessionSummary.accountId, ProjectView.defaultAccountId, AccountView, plan-usage event accountId, PlanUsageByAccount
packages/ui/src/client.ts           HeliconClient: listAccounts, createAccount, renameAccount, removeAccount, setProjectDefaultAccount; startSession +accountId; parseAccounts helper
apps/web/src/webClient.ts           WebHeliconClient implementations of the above
packages/ui/src/model/store.ts      AppState.accounts, AppState.planUsageByAccount, Prefs unchanged
packages/ui/src/model/controller.ts loadAccounts, createAccount/renameAccount/removeAccount/setProjectDefaultAccount (mutation template), per-account takePlanUsage, startThread passes the project default account
packages/ui/test/controller.test.ts FakeClient implements new methods; new controller tests
landing/src/demo/client.ts          DemoClient implements new methods
landing/src/product/*               regenerated by landing/scripts/sync-product-ui.mjs
```

---

### Task 1: Carry accountId on sessions and defaultAccountId on projects out to the wire

**Files:** Modify `packages/server/src/server.ts` (`summary()`, `GET /api/projects`); Test `packages/server/test/server.test.ts`.

**Interfaces:** Produces `summary()` output with `accountId: record.accountId`, and `GET /api/projects` items with `defaultAccountId: p.defaultAccountId`.

- [ ] **Step 1: Write the failing tests in `packages/server/test/server.test.ts`.** Reuse the `start()`/`send()`/`get()`/`createAonia` harness (imports already present from M2).

```ts
it("reports a session's account and a project's default account over the wire", async () => {
  const connection = new FakeConnection();
  connection.replies.set("session/start", { session: { sessionId: "s1" } });
  const home = await mkdtemp(join(tmpdir(), "helicon-aonia-"));
  const aonia = createAonia({ home, platform: "linux", musePath: "muse" });
  await aonia.createProfile("work");
  const { base } = await start(connection, { hostFactory: fakeFactory(connection), aonia });

  const created = await send(base, "/api/sessions", { cwd: "/work/proj", accountId: "work" });
  assert.equal(created.json.session.accountId, "work");
  const plain = await send(base, "/api/sessions", { cwd: "/other/proj" });
  assert.equal(plain.json.session.accountId, null);

  await send(base, "/api/projects/default-account", { cwd: "/work/proj", accountId: "work" }, "PATCH");
  const projects = await get(base, "/api/projects");
  const proj = projects.projects.find((p: { cwd: string }) => p.cwd === "/work/proj");
  assert.equal(proj.defaultAccountId, "work");
  const other = projects.projects.find((p: { cwd: string }) => p.cwd === "/other/proj");
  assert.equal(other.defaultAccountId, null);
});
```

- [ ] **Step 2: Run to see red.** `npm run build --workspace @helicon/daemon --workspace @helicon/ui --workspace @helicon/server && npm run test --workspace @helicon/server`. Expect the new test to fail (`accountId`/`defaultAccountId` undefined).

- [ ] **Step 3: Add `accountId` to `summary()`.** In `summary()` (grep `private summary(record: SessionRecord, cwd: string)`), add after `sandboxDisabled: record.sandboxDisabled,`:

```ts
      accountId: record.accountId,
```

- [ ] **Step 4: Add `defaultAccountId` to `GET /api/projects`.** In the `GET /api/projects` handler (grep `path === "/api/projects")`), add to the mapped object after `activityAt: p.activityAt,`:

```ts
          defaultAccountId: p.defaultAccountId,
```

- [ ] **Step 5: Run green.** Same command as Step 2. All server tests pass, pristine.

- [ ] **Step 6: Commit.**
```bash
git add packages/server/src/server.ts packages/server/test/server.test.ts
git commit -m "Report a session's account and a project's default account over the API"
```

---

### Task 2: Per-account plan usage on the server

**Files:** Modify `packages/server/src/server.ts` (`planUsage` field, `forward`, `observeUsage`, `readPlanUsage`, `GET /api/plan-usage`, the `plan-usage` emit); Test `packages/server/test/server.test.ts`.

**Interfaces:** Produces a `planUsageByAccount: Map<string, SubscriptionUsage>` on the server; `readPlanUsage()` returns `{ usage, byAccount }`; the `plan-usage` event is `{ type: "plan-usage", usage, accountId }` where `accountId` is `null` for the default login. `usage` stays the newest across all hosts, so a single-account UI is unaffected.

- [ ] **Step 1: Write the failing test.** A `usage/changed` notification arrives with the host key in scope; the test drives two hosts (two accounts) and asserts each account's usage is tracked separately while `usage` holds the newest.

```ts
it("tracks plan usage per account and keeps the newest as the default", async () => {
  const work = new FakeConnection();
  const personal = new FakeConnection();
  const home = await mkdtemp(join(tmpdir(), "helicon-aonia-"));
  const aonia = createAonia({ home, platform: "linux", musePath: "muse" });
  await aonia.createProfile("work");
  await aonia.createProfile("personal");
  // Route each account's host to its own connection so their notifications are distinct.
  const byCwdAccount = new Map<string, FakeConnection>();
  const factory = (target: ServeTarget): HostHandle => {
    const account = target.env?.["XDG_CONFIG_HOME"]?.includes("/work/") ? work : personal;
    return fakeFactory(account)(target);
  };
  const { base } = await start(work, { hostFactory: factory, aonia });

  work.replies.set("session/start", { session: { sessionId: "w1" } });
  personal.replies.set("session/start", { session: { sessionId: "p1" } });
  await send(base, "/api/sessions", { cwd: "/proj", accountId: "work" });
  await send(base, "/api/sessions", { cwd: "/proj", accountId: "personal" });

  work.notify("usage/changed", { usage: { tier: "1", observedAtMs: 100, window: { usedPercent: 90, resetsAtMs: 1, windowDurationMins: 300 }, weekly: { usedPercent: 50, resetsAtMs: 1, windowDurationMins: null } } });
  personal.notify("usage/changed", { usage: { tier: "1", observedAtMs: 200, window: { usedPercent: 12, resetsAtMs: 1, windowDurationMins: 300 }, weekly: { usedPercent: 8, resetsAtMs: 1, windowDurationMins: null } } });

  const res = await get(base, "/api/plan-usage");
  assert.equal(res.byAccount.work.window.usedPercent, 90);
  assert.equal(res.byAccount.personal.window.usedPercent, 12);
  assert.equal(res.usage.window.usedPercent, 12, "usage holds the newest across accounts");
});
```

If `ServeTarget`/`HostHandle` are not imported in the test file, they are; the sandbox tests use them.

- [ ] **Step 2: Run to see red.** `npm run test --workspace @helicon/server`. Expect `res.byAccount` undefined.

- [ ] **Step 3: Add the per-account map.** Next to `private planUsage: SubscriptionUsage | null = null;` add:

```ts
  /** The newest window per account, keyed by aonia profile id. The default login is not keyed here. */
  private readonly planUsageByAccount = new Map<string, SubscriptionUsage>();
```

- [ ] **Step 4: Attribute usage in `forward`.** In `forward(hostKey, notification)`, change the `usage/changed` branch to look up the emitting host's account:

```ts
      if (notification.method === "usage/changed") {
        const usage = parseSubscriptionUsage(params);
        const accountId = this.hosts.get(hostKey)?.accountId ?? null;
        this.observeUsage(usage, accountId);
        return;
      }
```

- [ ] **Step 5: Key `observeUsage` by account.** Change `observeUsage` to take an account and update both the global newest and the per-account map:

```ts
  private observeUsage(usage: SubscriptionUsage | null, accountId: string | null = null): void {
    if (!usage) {
      return;
    }
    if (accountId) {
      const prior = this.planUsageByAccount.get(accountId);
      if (!prior || prior.observedAtMs <= usage.observedAtMs) {
        this.planUsageByAccount.set(accountId, usage);
      }
    }
    if (!this.planUsage || this.planUsage.observedAtMs <= usage.observedAtMs) {
      this.planUsage = usage;
    }
    this.emit("helicon", { type: "plan-usage", usage, accountId });
  }
```

- [ ] **Step 6: Return both from `readPlanUsage` and the route.** Change `readPlanUsage` to poll every host with its account and return the pair:

```ts
  private async readPlanUsage(): Promise<{ usage: SubscriptionUsage | null; byAccount: Record<string, SubscriptionUsage> }> {
    await Promise.all(
      [...this.hosts.values()].map(async (managed) => {
        try {
          this.observeUsage(await managed.manager.readSubscriptionUsage(), managed.accountId);
        } catch {
          /* an older host without usage/read */
        }
      }),
    );
    return { usage: this.planUsage, byAccount: Object.fromEntries(this.planUsageByAccount) };
  }
```

Change the `GET /api/plan-usage` handler from `this.json(res, 200, { usage: await this.readPlanUsage() });` to:

```ts
      this.json(res, 200, await this.readPlanUsage());
```

- [ ] **Step 7: Run green.** `npm run test --workspace @helicon/server`. The new test and all existing ones pass. Note: the existing single-account plan-usage test asserts `{ usage }`; if it reads `.usage` off the response it still works because the shape now includes `usage`. If any existing test asserts the response is exactly `{ usage }`, update it to read `.usage` (allowed: it is the same value).

- [ ] **Step 8: Commit.**
```bash
git add packages/server/src/server.ts packages/server/test/server.test.ts
git commit -m "Track plan usage per account, keeping the newest window as the default"
```

---

### Task 3: UI types and the account client methods

**Files:** Modify `packages/ui/src/types.ts`, `packages/ui/src/client.ts`, `apps/web/src/webClient.ts`.

**Interfaces:** Produces `SessionSummary.accountId: string | null`; `ProjectView.defaultAccountId: string | null`; `AccountView { id; name; hasLogin; email: string | null; lastUsedAt: string | null }`; `PlanUsageByAccount = Record<string, PlanUsage>`; the `plan-usage` event `{ type: "plan-usage"; usage: PlanUsage; accountId: string | null }`; `HeliconClient.startSession(cwd, { approvalMode?, modelId?, accountId? })`; and `listAccounts()`, `createAccount(id, { name?, seedFromDefault? })`, `renameAccount(id, name)`, `removeAccount(id)`, `setProjectDefaultAccount(cwd, accountId)`, `planUsage(): Promise<{ usage: PlanUsage | null; byAccount: PlanUsageByAccount }>`.

- [ ] **Step 1: Edit `packages/ui/src/types.ts`.**
  - In `SessionSummary`, add after `sandboxDisabled: boolean | null;`:
    ```ts
      /** The aonia profile this thread runs under; null for the default login. */
      accountId: string | null;
    ```
  - In `ProjectView`, add after `activityAt: string;`:
    ```ts
      /** The account new threads here default to; null for the default login. */
      defaultAccountId: string | null;
    ```
  - Add near `PlanUsage`:
    ```ts
    export type PlanUsageByAccount = Record<string, PlanUsage>;

    export interface AccountView {
      id: string;
      name: string;
      hasLogin: boolean;
      email: string | null;
      lastUsedAt: string | null;
    }
    ```
  - Change the `plan-usage` member of `HeliconEvent` to:
    ```ts
      | { type: "plan-usage"; usage: PlanUsage; accountId: string | null }
    ```

- [ ] **Step 2: Edit `packages/ui/src/client.ts`.**
  - Change `startSession` in the `HeliconClient` interface to:
    ```ts
      startSession(cwd: string, options?: { approvalMode?: ApprovalMode; modelId?: string; accountId?: string | null }): Promise<SessionSummary>;
    ```
  - Change `planUsage` in the interface to:
    ```ts
      /** The window Muse last saw for the default login, plus a per-account map; empty until a host has seen one. */
      planUsage(): Promise<{ usage: PlanUsage | null; byAccount: import("./types.js").PlanUsageByAccount }>;
    ```
  - Add these members to the interface (near `getSandboxSettings`):
    ```ts
      /** Every aonia profile Helicon can run, with its non-secret identity. */
      listAccounts(): Promise<import("./types.js").AccountView[]>;
      /** Makes a profile; `seedFromDefault` copies settings.json and trust.json from the default login. */
      createAccount(id: string, options?: { name?: string; seedFromDefault?: boolean }): Promise<{ id: string; name: string }>;
      renameAccount(id: string, name: string): Promise<void>;
      removeAccount(id: string): Promise<void>;
      /** Sets which account new threads in a project default to; null clears it. */
      setProjectDefaultAccount(cwd: string, accountId: string | null): Promise<void>;
    ```
  - Add a parse helper near `parseSandboxSettings`:
    ```ts
    export function parseAccounts(value: unknown): import("./types.js").AccountView[] {
      const list = (value as { accounts?: unknown })?.accounts;
      if (!Array.isArray(list)) {
        return [];
      }
      return list.flatMap((raw) => {
        const a = raw as Record<string, unknown>;
        if (typeof a["id"] !== "string") {
          return [];
        }
        return [{
          id: a["id"],
          name: typeof a["name"] === "string" ? a["name"] : a["id"],
          hasLogin: a["hasLogin"] === true,
          email: typeof a["email"] === "string" ? a["email"] : null,
          lastUsedAt: typeof a["lastUsedAt"] === "string" ? a["lastUsedAt"] : null,
        }];
      });
    }
    ```

- [ ] **Step 3: Edit `apps/web/src/webClient.ts`.** Import `parseAccounts` and the `AccountView`/`PlanUsageByAccount` types. Change `startSession` to pass `accountId`:
    ```ts
      async startSession(cwd, options) {
        const result = await call<{ session: SessionSummary }>("POST", "/api/sessions", {
          cwd,
          approvalMode: options?.approvalMode,
          modelId: options?.modelId,
          accountId: options?.accountId ?? undefined,
        });
        return result.session;
      }
    ```
    Change `planUsage`:
    ```ts
      async planUsage() {
        const res = await call<{ usage: PlanUsage | null; byAccount?: PlanUsageByAccount }>("GET", "/api/plan-usage");
        return { usage: res.usage, byAccount: res.byAccount ?? {} };
      }
    ```
    Add the five account methods next to `getSandboxSettings`:
    ```ts
      async listAccounts() {
        return parseAccounts(await call<unknown>("GET", "/api/accounts"));
      }
      async createAccount(id, options) {
        const res = await call<{ account: { id: string; name: string } }>("POST", "/api/accounts", {
          id,
          name: options?.name,
          seedFromDefault: options?.seedFromDefault ?? false,
        });
        return res.account;
      }
      async renameAccount(id, name) {
        await call("PATCH", `/api/accounts/${encodeURIComponent(id)}`, { name });
      }
      async removeAccount(id) {
        await call("DELETE", `/api/accounts/${encodeURIComponent(id)}`);
      }
      async setProjectDefaultAccount(cwd, accountId) {
        await call("PATCH", "/api/projects/default-account", { cwd, accountId });
      }
    ```
    Give each the explicit types the interface declares if the file annotates method signatures; match the surrounding style.

- [ ] **Step 4: Build.** `npm run build --workspace @helicon/daemon --workspace @helicon/ui --workspace @helicon/server && npm run build --workspace @helicon/web`. The UI and web packages compile. The test `FakeClient` and `DemoClient` will fail to compile until Tasks 4 and 5; that is expected and those builds (`@helicon/ui` test, landing) are not run in this task. Confirm `@helicon/web` app build (not test) passes, since `WebHeliconClient` now satisfies the interface.

- [ ] **Step 5: Commit.**
```bash
git add packages/ui/src/types.ts packages/ui/src/client.ts apps/web/src/webClient.ts
git commit -m "Add account types and the account client methods, with a per-account plan usage shape"
```

---

### Task 4: Store, controller, and the test FakeClient

**Files:** Modify `packages/ui/src/model/store.ts`, `packages/ui/src/model/controller.ts`, `packages/ui/test/controller.test.ts`.

**Interfaces:** Produces `AppState.accounts: AccountView[] | null` and `AppState.planUsageByAccount: PlanUsageByAccount`; `controller.loadAccounts()`, `controller.createAccount(id, name?, seedFromDefault?)`, `controller.renameAccount(id, name)`, `controller.removeAccount(id)`, `controller.setProjectDefaultAccount(cwd, accountId)` (all using the sandbox-settings rev+chain+optimistic+rollback+toast template); `takePlanUsage` keyed by account; `startThread` passes the project's default account.

- [ ] **Step 1: Write the failing controller tests in `packages/ui/test/controller.test.ts`.** Extend `FakeClient` first (Step 3 has the stubs), then:

```ts
it("loads the account list and creates an account", async () => {
  const client = new FakeClient();
  const controller = makeController(client); // use the file's existing controller factory / setup
  await controller.loadAccounts();
  assert.deepEqual(controller.state.accounts?.map((a) => a.id), []);
  await controller.createAccount("work", "Work");
  assert.ok(client.accountCalls.some((c) => c.kind === "create" && c.id === "work"));
});

it("starts a new thread on the project's default account", async () => {
  const client = new FakeClient();
  client.projects = [{ cwd: "/work/app", displayName: "app", pinned: false, activityAt: SESSION.activityAt, defaultAccountId: "work" }];
  const controller = makeController(client);
  await controller.boot?.();
  await controller.newThread?.("/work/app");
  // send seeds a thread; assert the startSession call carried the account
  await controller.send("hello");
  assert.equal(client.startCalls.at(-1)?.accountId, "work");
});

it("keeps per-account plan usage from the event stream", () => {
  const client = new FakeClient();
  const controller = makeController(client);
  controller.onEventForTest?.({ type: "plan-usage", usage: PLAN, accountId: "work" });
  assert.equal(controller.state.planUsageByAccount["work"].window.usedPercent, PLAN.window.usedPercent);
});
```

Adapt the test scaffolding calls (`makeController`, `boot`, `onEventForTest`, `PLAN`, `SESSION`) to the file's actual helpers; the controller test file already constructs a `HeliconController` with a `FakeClient` and a fake `Platform` and drives `onEvent`. Use whatever the file already uses; do not invent new public methods on the controller beyond the five named above.

- [ ] **Step 2: Edit `packages/ui/src/model/store.ts`.** In `AppState`, add after `planUsage: PlanUsage | null;`:
```ts
  /** Every account Helicon can run; null until the first load answers. */
  accounts: import("../types.js").AccountView[] | null;
  /** The plan window per account, from `GET /api/plan-usage` and the `plan-usage` event. */
  planUsageByAccount: import("../types.js").PlanUsageByAccount;
```
Add to the initial state object (grep the `initialState`/`emptyState` builder, next to `planUsage: null`):
```ts
    accounts: null,
    planUsageByAccount: {},
```

- [ ] **Step 3: Edit `packages/ui/src/model/controller.ts`.**
  - Add fields near `sandboxSettingsRev`/`sandboxSettingsChain`:
    ```ts
    private accountsRev = 0;
    private accountsChain: Promise<void> = Promise.resolve();
    ```
  - `loadAccounts` (mirror `loadSandboxSettings`):
    ```ts
    async loadAccounts(): Promise<void> {
      const rev = ++this.accountsRev;
      try {
        const accounts = await this.client.listAccounts();
        if (rev === this.accountsRev) {
          this.update((s) => ({ ...s, accounts }));
        }
      } catch {
        /* opening Settings retries the load */
      }
    }
    ```
  - The four mutations, each a chained optimistic write that reloads the list and toasts on failure. Example for create (the others follow the same shape, calling `renameAccount`/`removeAccount`/`setProjectDefaultAccount` on the client and reloading):
    ```ts
    async createAccount(id: string, name?: string, seedFromDefault?: boolean): Promise<boolean> {
      const run = this.accountsChain.then(() =>
        this.client.createAccount(id, { ...(name ? { name } : {}), seedFromDefault: seedFromDefault ?? false }),
      );
      this.accountsChain = run.then(() => undefined, () => undefined);
      try {
        await run;
        await this.loadAccounts();
        return true;
      } catch (error) {
        this.toast("error", "Could not create the account", errorMessage(error));
        return false;
      }
    }
    ```
    `renameAccount(id, name)`, `removeAccount(id)`, and `setProjectDefaultAccount(cwd, accountId)` each: chain the client call, on success `await this.loadAccounts()` (and for the project default, update `s.projects` in place so the new-thread default is immediate), on failure toast. `setProjectDefaultAccount` updates the project optimistically:
    ```ts
    async setProjectDefaultAccount(cwd: string, accountId: string | null): Promise<void> {
      const previous = this.state.projects;
      this.update((s) => ({ ...s, projects: s.projects.map((p) => (p.cwd === cwd ? { ...p, defaultAccountId: accountId } : p)) }));
      const run = this.accountsChain.then(() => this.client.setProjectDefaultAccount(cwd, accountId));
      this.accountsChain = run.then(() => undefined, () => undefined);
      try {
        await run;
      } catch (error) {
        this.update((s) => ({ ...s, projects: previous }));
        this.toast("error", "Could not set the default account", errorMessage(error));
      }
    }
    ```
  - `takePlanUsage`: key by account. Change its signature to `private takePlanUsage(usage: PlanUsage, accountId: string | null = null)`; when `accountId` is set, update `planUsageByAccount` (newest wins) as well as the global `planUsage`. The `plan-usage` event case becomes `this.takePlanUsage(event.usage, event.accountId)`. `loadPlanUsage` now reads `{ usage, byAccount }`: keep the global via `takePlanUsage(res.usage)` when present, and merge `res.byAccount` into `planUsageByAccount`.
  - Boot: add `void this.loadAccounts();` next to the boot `loadPlanUsage`/`loadSandboxSettings` calls, and re-load accounts when the Settings route opens (next to the settings-route lazy loads).
  - `startThread`: read the project's default account and pass it. Find where `startThread` reads `const { defaultMode, defaultModelId } = this.state.prefs;` and add:
    ```ts
      const project = this.state.projects.find((p) => p.cwd === cwd);
      const accountId = project?.defaultAccountId ?? null;
    ```
    then pass `accountId` in the `client.startSession(cwd, { approvalMode, modelId: ..., accountId })` call.

- [ ] **Step 4: Extend the test `FakeClient` (Step 1 depends on it).** In `packages/ui/test/controller.test.ts`, add to `FakeClient`: an `accounts: AccountView[] = []`, an `accountCalls: {kind, id?, cwd?, accountId?, name?}[] = []`, and the five methods:
    ```ts
    async listAccounts() { return [...this.accounts]; }
    async createAccount(id: string, options?: { name?: string; seedFromDefault?: boolean }) {
      this.accountCalls.push({ kind: "create", id }); this.accounts.push({ id, name: options?.name ?? id, hasLogin: false, email: null, lastUsedAt: null }); return { id, name: options?.name ?? id };
    }
    async renameAccount(id: string, name: string) { this.accountCalls.push({ kind: "rename", id }); const a = this.accounts.find((x) => x.id === id); if (a) a.name = name; }
    async removeAccount(id: string) { this.accountCalls.push({ kind: "remove", id }); this.accounts = this.accounts.filter((x) => x.id !== id); }
    async setProjectDefaultAccount(cwd: string, accountId: string | null) { this.accountCalls.push({ kind: "default", cwd, accountId }); }
    ```
    Change the existing `startSession` stub to record `accountId`: `this.startCalls.push({ cwd, approvalMode: options?.approvalMode, modelId: options?.modelId, accountId: options?.accountId ?? null });` and widen `startCalls`' type. Change `planUsage` to `async planUsage() { return { usage: this.plan, byAccount: this.planByAccount ?? {} }; }` and add `planByAccount: Record<string, PlanUsage> = {};`. Ensure `FakeClient`'s `listProjects` returns items with `defaultAccountId: null` (add the field) so it satisfies `ProjectView`.

- [ ] **Step 5: Run green.** `npm run test --workspace @helicon/daemon --workspace @helicon/ui --workspace @helicon/server`. All pass, pristine. Also `npm run build --workspace @helicon/web` still green.

- [ ] **Step 6: Commit.**
```bash
git add packages/ui/src/model/store.ts packages/ui/src/model/controller.ts packages/ui/test/controller.test.ts
git commit -m "Load accounts and per-account plan usage, and start threads on the project default"
```

---

### Task 5: Demo client and landing sync

**Files:** Modify `landing/src/demo/client.ts`; regenerate `landing/src/product/*` via the sync script.

**Interfaces:** Consumes the new `HeliconClient` members; produces a `DemoClient` that implements them and a synced `landing/src/product` copy.

- [ ] **Step 1: Implement the new methods on `DemoClient` in `landing/src/demo/client.ts`.** The demo has no real accounts; return an empty list and no-op the mutations, and give `planUsage` the pair shape:
    ```ts
    async listAccounts() { return []; }
    async createAccount(id: string, options?: { name?: string; seedFromDefault?: boolean }) { return { id, name: options?.name ?? id }; }
    async renameAccount() {}
    async removeAccount() {}
    async setProjectDefaultAccount() {}
    ```
    Change `planUsage` to return `{ usage: <the existing PlanUsage object>, byAccount: {} }`. Change `startSession(cwd)` to accept the options object (it can ignore `accountId`): `async startSession(cwd: string, _options?: { approvalMode?: string; modelId?: string; accountId?: string | null }): Promise<SessionSummary>` and keep the body. Add `defaultAccountId: null` to every `ProjectView` the demo's `listProjects` returns, and `accountId: null` to the `summary(...)` builder's returned `SessionSummary` (find the `summary(` helper in the demo file and add the field so it satisfies the type).

- [ ] **Step 2: Build the demo package to confirm it compiles.** From `landing/`: `npm run build 2>&1 | tail -20` (or the landing typecheck script). Expect the DemoClient to now satisfy `HeliconClient`. If the landing build script is not obvious, run `npx tsc --noEmit -p landing/tsconfig.json` from the repo root.

- [ ] **Step 3: Regenerate the product mirror.** From `landing/`: `node scripts/sync-product-ui.mjs`. This copies `packages/ui/src` into `landing/src/product` (so `types.ts`, `client.ts`, `model/*` carry the M3a changes). Confirm `git status` shows the regenerated `landing/src/product/*` files and nothing outside `landing/`.

- [ ] **Step 4: Build landing again after the sync.** Same as Step 2; the product copy and the demo client must both compile against the new interface.

- [ ] **Step 5: Whole-repo check.** From the root: `npm run build --workspace @helicon/daemon --workspace @helicon/ui --workspace @helicon/server && npm run test --workspace @helicon/daemon --workspace @helicon/ui --workspace @helicon/server && npm run build --workspace @helicon/web && npm run test --workspace @helicon/web`. All green.

- [ ] **Step 6: Commit.**
```bash
git add landing/src/demo/client.ts landing/src/product
git commit -m "Implement the account methods in the demo client and sync the landing product copy"
```

---

## Self-review

**Spec coverage.** P4 per-account usage map: Task 2 (server) and Task 4 (`planUsageByAccount` in store/controller). The wire fields the UI needs: Task 1 (`accountId`/`defaultAccountId`), Task 3 (types + client methods). The account list and mutations M3b's Settings panel needs: Tasks 3 and 4. `startSession` account and the project-default default: Task 4. Landing/demo kept in step: Task 5. No visual components, matching the M3a/M3b split.

**Placeholders.** The controller-test scaffolding calls in Task 4 Step 1 are marked to adapt to the file's real helpers, because the exact test harness (`makeController`, boot, event injection) is read at implementation time; the five controller methods and the FakeClient stubs are given in full. Everything else is exact.

**Type consistency.** `accountId: string | null` on `SessionSummary` and in `startSession` options (`string | null`), `defaultAccountId: string | null` on `ProjectView`, `AccountView`/`PlanUsageByAccount` used identically in types, client, store, controller, and both fakes. The `plan-usage` event's `accountId: string | null` matches the server emit in Task 2 and the `takePlanUsage` signature in Task 4.

**Ruling for the controller:** `GET /api/plan-usage` returns `{ usage, byAccount }` rather than replacing `usage`, so a client that only reads `.usage` (today's UI, until M3b) is unaffected; `usage` stays the newest window across all accounts. Cost if wrong: a single-meter UI shows the newest account's window rather than the default login's specifically, which is the same behaviour it has today with one host.
