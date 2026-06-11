// gates/lib/args.js — tiny --flag value parser for standalone gate runs.
function parse(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    } else if (!out._) {
      out._ = a;
    }
  }
  return out;
}
module.exports = { parse };
