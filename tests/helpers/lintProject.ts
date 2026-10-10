import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { ESLint } from 'eslint';

const run = promisify(execFile);
const runner = fileURLToPath(new URL('./lint-project.mjs', import.meta.url));

/** Real project linting must not share a Bun process with Vite's dependency loader. */
export async function lintProjectFiles(files: string[], projectDirectory: string): Promise<ESLint.LintResult[]> {
  const { stdout } = await run('node', [runner, ...files], {
    cwd: projectDirectory,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(stdout) as ESLint.LintResult[];
}
