import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintProjectFiles } from './helpers/lintProject';

const projectDirectory = dirname(dirname(fileURLToPath(import.meta.url)));

// Actual project ESLint configuration, including TypeScript resolution and plugin compatibility.
test('portable coding rules accept valid code and reject real violations', async () => {
  const fixtureDirectory = await mkdtemp(join(projectDirectory, 'src/coding-lint-fixture-'));
  const fixtures: Record<string, { source: string; rule?: string }> = {
    'valid.tsx': {
      source: `import type { CSSProperties } from 'react';
interface CardProps { isVisible: boolean; names: string[]; style?: CSSProperties; }
export function Card({ isVisible, names, style }: CardProps) {
  if (!isVisible) { return null; }
  const handleClick = () => { console.info('clicked'); };
  return <button type="button" style={style} onClick={handleClick}>{names.join(', ')}</button>;
}`,
    },
    'non-react-fc.ts': {
      source: `interface FC { name: string; }
export const entry: FC = { name: 'local type' };`,
    },
    'any.ts': { source: 'export const entry: any = null;', rule: '@typescript-eslint/no-explicit-any' },
    'react-fc.tsx': {
      source: "import type React from 'react'; export const Card: React.FC = () => null;",
      rule: 'conventions/no-react-fc',
    },
    'aliased-fc.tsx': {
      source: "import type { FC as Component } from 'react'; export const Card: Component = () => null;",
      rule: 'conventions/no-react-fc',
    },
    'namespace-fc.tsx': {
      source: "import type * as R from 'react'; export const Card: R.FunctionComponent = () => null;",
      rule: 'conventions/no-react-fc',
    },
    'namespace-short-fc.tsx': {
      source: "import type * as R from 'react'; export const Card: R.FC = () => null;",
      rule: 'conventions/no-react-fc',
    },
    'inline-fc.tsx': {
      source: "export const Card: import('react').FC = () => null;",
      rule: 'conventions/no-react-fc',
    },
    'naming.ts': {
      source: 'export interface invalid_name { value: number; }',
      rule: '@typescript-eslint/naming-convention',
    },
    'curly.ts': { source: 'export function read(value: number) { if (value) return value; return 0; }', rule: 'curly' },
    'equality.ts': { source: 'export function equal(a: number, b: number) { return a == b; }', rule: 'eqeqeq' },
    'null-comparison.ts': { source: 'export function isMissing(value: unknown) { return value == null; }' },
    'console.ts': { source: "export function report() { console.log('debug'); }", rule: 'no-console' },
    'array.ts': { source: 'export const names: Array<string> = [];', rule: '@typescript-eslint/array-type' },
    'type-import.ts': {
      source: "import { CSSProperties } from 'react'; export const style: CSSProperties = {};",
      rule: '@typescript-eslint/consistent-type-imports',
    },
    'a11y.tsx': {
      source: 'export function Picture() { return <img src="/ticket.png" />; }',
      rule: 'jsx-a11y/alt-text',
    },
    'dom-prop.tsx': {
      source: 'export function Card() { return <div class="ticket" />; }',
      rule: 'react/no-unknown-property',
    },
  };

  try {
    await Promise.all(
      Object.entries(fixtures).map(([name, fixture]) => writeFile(join(fixtureDirectory, name), fixture.source)),
    );
    const results = await lintProjectFiles(
      Object.keys(fixtures).map((name) => join(fixtureDirectory, name)),
      projectDirectory,
    );
    expect(results).toHaveLength(Object.keys(fixtures).length);
    for (const [name, fixture] of Object.entries(fixtures)) {
      const result = results.find((entry) => entry.filePath === join(fixtureDirectory, name));
      expect(result, name).toBeDefined();
      expect(result!.fatalErrorCount, name).toBe(0);
      if (fixture.rule) {
        expect(
          result!.messages.map((message) => message.ruleId),
          name,
        ).toContain(fixture.rule);
      } else {
        expect(result!.messages, name).toEqual([]);
      }
    }
  } finally {
    await rm(fixtureDirectory, { recursive: true, force: true });
  }
}, 30_000);
