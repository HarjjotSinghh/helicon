import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "../src/slugify.js";

test("lowercases and joins words", () => {
  assert.equal(slugify("Hello World"), "hello-world");
});

test("drops punctuation", () => {
  assert.equal(slugify("Hello, World!"), "hello-world");
});

test("collapses runs of spaces", () => {
  assert.equal(slugify("Ship   it   today"), "ship-it-today");
});
