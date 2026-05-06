/**
 * Tests for lib/at-mention (P0.14b).
 *
 * Locks the @-mention popup behavior contract. Get either function wrong
 * and the popup either fails to open (mention disabled) or refuses to
 * close (popup sticks after candidate picked).
 */

import test from "node:test";
import assert from "node:assert/strict";

import { shouldOpenAtPopup, stripTrailingAtMention } from "../lib/at-mention";

// ---------------------------------------------------------------------------
// shouldOpenAtPopup
// ---------------------------------------------------------------------------

test("shouldOpenAtPopup: opens when caret is right after a fresh @", () => {
  assert.equal(shouldOpenAtPopup("hello @", 7), true);
});

test("shouldOpenAtPopup: opens while user narrows candidate (@al)", () => {
  assert.equal(shouldOpenAtPopup("hello @al", 9), true);
});

test("shouldOpenAtPopup: opens at the very start of input (@)", () => {
  assert.equal(shouldOpenAtPopup("@bob", 4), true);
});

test("shouldOpenAtPopup: closes once a space follows the @-mention", () => {
  assert.equal(shouldOpenAtPopup("hello @alice ", 13), false);
});

test("shouldOpenAtPopup: closes for emails (no whitespace before @)", () => {
  // "email me a@b.com" — the "@" has "a" right before it, not whitespace.
  assert.equal(shouldOpenAtPopup("email me a@b.com", 16), false);
  assert.equal(shouldOpenAtPopup("plain user@host", 15), false);
});

test("shouldOpenAtPopup: respects cursor position (caret before @)", () => {
  // The @ exists in `value` but the cursor is before it — popup must not open.
  assert.equal(shouldOpenAtPopup("@bob", 0), false);
  assert.equal(shouldOpenAtPopup("hello @bob", 5), false);
});

test("shouldOpenAtPopup: empty input does not open popup", () => {
  assert.equal(shouldOpenAtPopup("", 0), false);
});

test("shouldOpenAtPopup: handles newline as whitespace boundary", () => {
  assert.equal(shouldOpenAtPopup("first line\n@bob", 15), true);
});

// ---------------------------------------------------------------------------
// stripTrailingAtMention
// ---------------------------------------------------------------------------

test("stripTrailingAtMention: drops the @-token plus separator", () => {
  assert.equal(stripTrailingAtMention("hello @al"), "hello");
});

test("stripTrailingAtMention: drops a bare trailing @", () => {
  assert.equal(stripTrailingAtMention("hello @"), "hello");
});

test("stripTrailingAtMention: leaves text without a trailing @-token alone", () => {
  assert.equal(stripTrailingAtMention("no mention"), "no mention");
});

test("stripTrailingAtMention: returns empty string when only the @-token exists", () => {
  assert.equal(stripTrailingAtMention("@just-the-tag"), "");
});

test("stripTrailingAtMention: leaves emails (a@b.com) intact (no leading space)", () => {
  assert.equal(stripTrailingAtMention("email me a@b.com"), "email me a@b.com");
});

test("stripTrailingAtMention: idempotent on already-cleaned input", () => {
  const cleaned = stripTrailingAtMention("hello @al");
  assert.equal(stripTrailingAtMention(cleaned), cleaned);
});

test("stripTrailingAtMention: trims trailing whitespace from result", () => {
  assert.equal(stripTrailingAtMention("hello   @al"), "hello");
});
