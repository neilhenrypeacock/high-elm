import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  // .claude/worktrees holds per-session git worktrees (each with its own .next
  // build output) — never lint another checkout's files from this one.
  globalIgnores(['.next/**', 'node_modules/**', 'next-env.d.ts', '.claude/worktrees/**']),
  ...nextVitals,
]);
