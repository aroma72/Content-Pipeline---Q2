---
type: reference
last_verified: 2026-09-23
owner: aroma
---

# Shell and codegen escaping traps

Contents: [1. Never nest a regex in a template literal](#1) · [2. Anchors must be unique](#2) ·
[3. CRLF](#3) · [4. Heredocs and quoting](#4) · [5. sed](#5) · [6. The safe recipe](#6)

About thirteen tool failures in this repo trace to this file's contents. The pattern is always the
same: a script that *generates* another script, where one layer of escaping silently eats another.

## <a name="1"></a>1. Never nest a regex inside a template literal

In a JS template literal, backslash escapes are consumed by the literal before the regex ever sees
them.

- `\s` becomes `s`. `/\bcode:\s*'...'/` was written to disk as `/code:s*'...'/` — a regex matching
  nothing. The test still "passed".
- `\b` becomes a **backspace character**, not a word boundary. This has bitten three separate times.

```js
// WRONG - the outer literal eats the escapes
const patch = `if (/\bfoo\s+bar/.test(x)) ...`;

// RIGHT - write the regex line to its own file with a quoted heredoc, then splice by line number
```

If you must embed one, double every backslash (`\s`, `\b`) and then **read the generated file
back and confirm the regex is intact** before running it.

## <a name="2"></a>2. An anchor must be unique, not merely present

Three consecutive `Error: anchor not found` failures came from anchor-patch scripts. The opposite
failure is worse: an anchor that appears twice patches the wrong one silently.

```js
if (src.split(anchor).length !== 2) throw new Error(`anchor is not unique: ${anchor}`);
```

Assert uniqueness, not existence.

## <a name="3"></a>3. Most files here are CRLF

A script that reads a file, splits on `\n`, and writes back a `\n`-joined string **converts the
whole file to LF**, producing a diff of every line and hiding the one real change.

```bash
file path/to/x.md | grep -q CRLF && echo "must write \r\n"
```

When generating lines for a CRLF file, use `printf 'text\r\n'`, not `echo`.

## <a name="4"></a>4. Heredocs and quoting

Two `unexpected EOF while looking for matching quote` failures, eight days apart, both from
multi-line inline `bash -c` strings.

- Use `<<'EOF'` (**quoted**) so `$`, backticks and backslashes pass through untouched.
- The closing delimiter must be at column 0 with nothing after it.
- Prefer writing a script to a file and running it over a long inline `bash -c`.
- A YAML scalar cannot contain `": "` unquoted — this silently broke four skill descriptions.

## <a name="5"></a>5. sed

`sed: -e expression #1, char 1: unknown command: `,'` — the replacement text contained the
delimiter. Choose a delimiter absent from the data (`sed 's|a|b|'`) and prefer `awk` when the
replacement is a whole line of prose.

## <a name="6"></a>6. The safe recipe

1. Write the new content to its own file with a **quoted** heredoc.
2. Splice by line number (`awk 'NR==3{...}'`) or by a uniqueness-asserted anchor.
3. Preserve the original line endings.
4. Read the result back and confirm it says what you intended.
5. Only then run it.
