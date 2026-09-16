// Static checks for the one class of defect `node --check` cannot see.
//
// `node --check` validates SYNTAX. It says nothing about whether a name
// resolves, so `staleVo(beats, dir)` — where `beats` is bound nowhere in that
// function — passed every check and shipped. It throws only when control
// reaches that line, which in the pipeline is after the art has been paid for.
// That happened twice in one session.
//
// Deliberately narrow: no style rules, no opinions about formatting. Only
// things that are wrong at runtime and invisible until then.
export default [
  {
    files: ['orchestrator/**/*.js', 'server/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        structuredClone: 'readonly',
        exports: 'writable',
        globalThis: 'readonly',
        URLSearchParams: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      // The one that matters: a name that resolves to nothing.
      'no-undef': 'error',
      // A name that exists but not YET. `pruneOrphans(beatsForArt, ...)` ran
      // twenty lines above its own const -- a temporal-dead-zone ReferenceError
      // on every real run, and invisible to no-undef because the binding does
      // exist. Functions are hoisted and are genuinely fine to call earlier.
      'no-use-before-define': ['error', { functions: false, classes: false, variables: true }],
      // A variable assigned and never read is usually half of an edit that was
      // not finished -- which is how `animAlreadyBought` survived as a
      // reference after the thing that defined it was removed.
      'no-unused-vars': ['error', {
        args: 'none',
        varsIgnorePattern: '^_',
        // `const { id, ...rest } = e` omits a key on purpose.
        ignoreRestSiblings: true,
        caughtErrors: 'none',
      }],
      // Two more that are silently wrong at runtime rather than merely untidy.
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-const-assign': 'error',
      'no-self-assign': 'error',
    },
  },
  {
    // Code inside page.evaluate() runs in Chrome, not in Node. These names are
    // real there and undefined here, so the check is told which file is which
    // rather than being switched off.
    files: ['scripts/record-demo.js'],
    languageOptions: {
      globals: {
        window: 'readonly', document: 'readonly', navigator: 'readonly',
        Response: 'readonly', Event: 'readonly', HTMLElement: 'readonly',
      },
    },
  },
];
