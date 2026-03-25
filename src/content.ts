import {
  PokemonDict,
  MovesDict,
  ItemsDict,
  AliasDict,
  TypesDict,
  NaturesDict,
  AbilitiesDict,
  miscDict,
} from "../translations";

const WORD_RE_SRC = "[A-Za-z0-9][A-Za-z0-9\\-+.'()]*";

const lookup = (core: string): string | undefined => {
  const key = core.trim();
  if (!key) return undefined;
  return (
    PokemonDict[key] ??
    MovesDict[key] ??
    ItemsDict[key] ??
    AliasDict[key] ??
    TypesDict[key] ??
    NaturesDict[key] ??
    AbilitiesDict[key] ??
    miscDict[key]
  );
};

let MAX_WORDS = 1;
const dictList = [
  PokemonDict,
  MovesDict,
  ItemsDict,
  AliasDict,
  TypesDict,
  NaturesDict,
  AbilitiesDict,
  miscDict,
];

for (const dict of dictList) {
  for (const k of Object.keys(dict)) {
    const words = k.split(" ").filter(Boolean).length;
    if (words > MAX_WORDS) MAX_WORDS = words;
  }
}

function translateToken(token: string): string {
  // In-place translation: replace dictionary tokens found inside a text node.
  // We preserve punctuation by only replacing "words" (tokens) and sequences separated by spaces.

  // Intentionally simple and robust for your "pre"-like content: object/ability/move/title names.
  const wordRe = new RegExp(WORD_RE_SRC, "g");

  const matches: Array<{ text: string; start: number; end: number }> = [];
  for (const m of token.matchAll(wordRe)) {
    if (m.index == null) continue;
    matches.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }

  if (matches.length === 0) return token;

  let out = "";
  let cursor = 0;

  for (let i = 0; i < matches.length; i++) {
    const t = matches[i];

    // Text before the current word.
    out += token.slice(cursor, t.start);

    // Try to match the longest (multi-word) key first.
    let replaced = false;
    for (let k = Math.min(MAX_WORDS, matches.length - i); k >= 2; k--) {
      const first = matches[i];
      const last = matches[i + k - 1];
      const between = token.slice(first.end, last.start);
      if (between.trim() !== "") continue; // only spaces allowed between words

      const core = matches
        .slice(i, i + k)
        .map((x) => x.text)
        .join(" ");
      const translated = lookup(core);
      if (!translated) continue; // no dictionary entry for this key

      out += translated;
      cursor = last.end;
      i += k - 1;
      replaced = true;
      break;
    }

    if (replaced) continue;

    const translated = lookup(t.text);
    out += translated ?? t.text;
    cursor = t.end;
  }

  out += token.slice(cursor);
  return out;
}

function shouldSkipTextNode(node: Text) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (parent.closest('[contenteditable="true"]')) return true;

  // Avoid touching "technical" DOM elements.
  return !!parent.closest(
    "script,style,noscript,textarea,input,select,option,code,kbd,samp,var",
  );
}

function translateAllTextNodes(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const node = n as Text;
    const value = node.nodeValue ?? "";
    if (!value.trim()) continue;
    if (shouldSkipTextNode(node)) continue;
    textNodes.push(node);
  }

  // Translate in 2 phases to avoid TreeWalker issues when mutating the DOM.
  for (const node of textNodes) {
    const original = node.nodeValue ?? "";
    node.nodeValue = translateToken(original);
  }
}

function start() {
  translateAllTextNodes(document.body);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
