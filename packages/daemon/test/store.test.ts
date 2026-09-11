import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { HeliconStore } from "../src/store.js";

describe("HeliconStore", () => {
  it("groups sessions under projects by directory", () => {
    const store = new HeliconStore();
    after(() => store.close());
    const project = store.upsertProject("D:\\work\\helicon");
    assert.equal(project.displayName, "helicon");
    assert.equal(project.pinned, false);
    const same = store.upsertProject("D:\\work\\helicon");
    assert.equal(same.id, project.id);
    const session = store.recordSession({ id: "s1", projectId: project.id });
    assert.equal(session.turnCount, 0);
    assert.equal(session.origin, "helicon");
    store.recordTurn("t1", "s1");
    store.updateTurnStatus("t1", "completed");
    const sessions = store.listSessionsByProject(project.id);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0]?.turnCount, 1);
    assert.equal(sessions[0]?.id, "s1");
  });

  it("never lets a weaker title source overwrite a stronger one", () => {
    const store = new HeliconStore();
    after(() => store.close());
    const project = store.upsertProject("/work/p");
    const created = store.recordSession({ id: "s1", projectId: project.id });
    assert.equal(created.titleSource, "placeholder");
    store.recordSession({ id: "s1", projectId: project.id, title: "Fix the build", titleSource: "auto" });
    assert.equal(store.getSession("s1")?.title, "Fix the build");
    store.updateSession("s1", { title: "Renamed", titleSource: "user" });
    store.recordSession({ id: "s1", projectId: project.id, title: "Auto again", titleSource: "auto" });
    assert.equal(store.getSession("s1")?.title, "Renamed");
    assert.equal(store.findSession("s1")?.cwd, "/work/p");
  });

  it("archives sessions and hides projects without deleting them", () => {
    const store = new HeliconStore();
    after(() => store.close());
    const project = store.upsertProject("/work/p");
    store.recordSession({ id: "s1", projectId: project.id });
    store.recordSession({ id: "s2", projectId: project.id });
    store.updateSession("s1", { archived: true });
    assert.deepEqual(
      store.listSessionsByProject(project.id).map((s) => s.id),
      ["s2"],
    );
    assert.equal(store.listSessionsByProject(project.id, { includeArchived: true }).length, 2);
    store.setHidden("/work/p", true);
    assert.equal(store.listProjects().length, 0);
    assert.equal(store.listProjects({ includeHidden: true }).length, 1);
    store.upsertProject("/work/p");
    assert.equal(store.listProjects().length, 0, "discovery alone must not unhide a project");
  });

  it("orders projects by their latest session activity", () => {
    const store = new HeliconStore();
    after(() => store.close());
    const a = store.upsertProject("/work/a");
    const b = store.upsertProject("/work/b");
    store.recordSession({ id: "a1", projectId: a.id, activityAt: "2026-01-01T00:00:00.000Z" });
    store.recordSession({ id: "b1", projectId: b.id, activityAt: "2026-02-01T00:00:00.000Z" });
    assert.deepEqual(
      store.listProjects().map((p) => p.cwd),
      ["/work/b", "/work/a"],
    );
    store.recordSession({ id: "a1", projectId: a.id, activityAt: "2026-03-01T00:00:00.000Z" });
    assert.equal(store.listProjects()[0]?.cwd, "/work/a");
  });

  it("pins projects to the top of the sidebar order", () => {
    const store = new HeliconStore();
    after(() => store.close());
    store.upsertProject("D:\\work\\b");
    store.upsertProject("D:\\work\\a");
    store.setPinned("D:\\work\\a", true);
    const projects = store.listProjects();
    assert.equal(projects[0]?.cwd, "D:\\work\\a");
    assert.equal(projects[0]?.pinned, true);
  });
});
