import process from 'node:process';
import { ESLint } from 'eslint';

// Use the same Node runtime as the ESLint CLI, isolated from Bun's test runtime.
const eslint = new ESLint({ cwd: process.cwd() });
const results = await eslint.lintFiles(process.argv.slice(2));
process.stdout.write(JSON.stringify(results));
