import test from "node:test";
import assert from "node:assert/strict";
import { getContextUserEntryIds } from "../shared/context-entry-ids.mjs";

test("uses the active branch on current OMP hosts", () => {
  const sessionManager = {
    getBranch() {
      return [
        { id: "active-user", type: "message", message: { role: "user" } },
        { id: "active-assistant", type: "message", message: { role: "assistant" } },
      ];
    },
    getEntries() {
      return [
        { id: "abandoned-user", type: "message", message: { role: "user" } },
      ];
    },
  };

  assert.deepEqual(getContextUserEntryIds(sessionManager), ["active-user"]);
});

test("falls back to buildContextEntries on older hosts", () => {
  const sessionManager = {
    buildContextEntries() {
      return [
        { id: "legacy-user", type: "message", message: { role: "user" } },
        { id: "custom", type: "custom", message: { role: "user" } },
      ];
    },
  };

  assert.deepEqual(getContextUserEntryIds(sessionManager), ["legacy-user"]);
});

test("returns no ids when neither API is available", () => {
  assert.deepEqual(getContextUserEntryIds({}), []);
});
