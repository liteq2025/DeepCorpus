/**
 * @-mention helpers for the chat composer.
 *
 * Two pure functions originally inlined in ComposerInput.tsx — extracted to
 * web/lib/ so they're testable on the node-test runner (no JSX), match the
 * conventions used by lib/composer-keyboard.ts, and can be reused by other
 * surfaces that want @-mention behavior (e.g. SimpleComposerInput).
 */

/**
 * Decide whether the @-mention popup should be open at the current caret.
 *
 * Returns true iff the slice of *value* from the start to *cursorPos* ends
 * with `@<no-whitespace>` after a word boundary (start-of-input or whitespace).
 * Examples:
 *   "hello @"           → true   (popup just opened)
 *   "hello @al"         → true   (still narrowing the candidate)
 *   "hello @alice "     → false  (mention already committed)
 *   "email me a@b.com"  → false  (@ has no leading whitespace)
 *   ""                  → false
 */
export function shouldOpenAtPopup(value: string, cursorPos: number): boolean {
  const prefix = value.slice(0, cursorPos);
  return /(^|\s)@[^\s]*$/.test(prefix);
}

/**
 * Remove the trailing in-progress @-mention token after a candidate is picked.
 *
 * Strips the last `@…` group at the end of *value*, plus any surrounding
 * whitespace, so the picked candidate can be appended cleanly. Idempotent.
 * Examples:
 *   "hello @al"     → "hello"
 *   "hello @"       → "hello"
 *   "no mention"    → "no mention"
 *   "@just-the-tag" → ""
 */
export function stripTrailingAtMention(value: string): string {
  return value.replace(/(^|\s)@[^\s]*$/, "$1").replace(/\s+$/, "");
}
