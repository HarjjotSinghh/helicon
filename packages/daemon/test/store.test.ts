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
