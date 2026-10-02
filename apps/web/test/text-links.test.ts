import assert from "node:assert/strict";
import test from "node:test";
import { splitLinks } from "../src/lib/text-links.ts";

test("splitLinks leaves text without URLs whole", () => {
  assert.deepEqual(splitLinks("I accept the Terms."), [{ text: "I accept the Terms." }]);
  assert.deepEqual(splitLinks(""), []);
});

test("splitLinks links a URL in parentheses and keeps the text around it", () => {
  assert.deepEqual(splitLinks("under the Data Processing Agreement (https://things.sensical.es/dpa). If I'm"), [
    { text: "under the Data Processing Agreement (" },
    { text: "https://things.sensical.es/dpa", href: "https://things.sensical.es/dpa" },
    { text: "). If I'm" },
  ]);
});

test("splitLinks leaves trailing punctuation outside the link", () => {
  assert.deepEqual(splitLinks("See http://localhost:5173/dpa."), [
    { text: "See " },
    { text: "http://localhost:5173/dpa", href: "http://localhost:5173/dpa" },
    { text: "." },
  ]);
});
