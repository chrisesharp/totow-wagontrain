export default {
  input: ['src/scripts/main.mjs'],
  output: {
    dir: 'dist/scripts',
    entryFileNames: 'main.mjs',
    format: 'es',
    sourcemap: true,
  },
  external: [],
  preserveEntrySignatures: false,
};
