import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintProjectFiles } from './helpers/lintProject';

const projectDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const scopeRule = 'export-scope/no-imports-outside-export-scope';

test('actual ESLint config keeps owner and nested component exports private', async () => {
  // Real files exercise TypeScript resolution, including @ aliases and type imports.
  const fixtureDirectory = await mkdtemp(join(projectDirectory, 'src/scope-lint-fixture-'));
  const fixtureName = basename(fixtureDirectory);
  const ownerScope = `src/${fixtureName}/owner`;
  const alias = `@/${fixtureName}`;
  const fixtures = {
    '.scope.default.ts': "export default '*'\n",
    'owner/.scope.default.ts': `export default '${ownerScope}'\n`,
    'owner/index.ts':
      '/** @scopeDefault * */\n' +
      "export { value } from './internal'\n" +
      "export { componentValue } from './component'\n",
    'owner/internal.ts': 'export const value = 1\nexport interface InternalValue { value: number }\n',
    'owner/consumer.ts': "import { value } from './internal'\nexport const result = value\n",
    'owner/component/.scope.default.ts': `export default '${ownerScope}/component'\n`,
    'owner/component/index.ts': `/** @scopeDefault ${ownerScope} */\n` + "export { componentValue } from './helper'\n",
    'owner/component/helper.ts': 'export const componentValue = 2\n',
    'owner/component/consumer.ts': "import { componentValue } from './helper'\nexport const result = componentValue\n",
    'owner/sibling.ts': "import { componentValue } from './component/helper'\nexport const result = componentValue\n",
    'owner/other-component/consumer.ts':
      "import { componentValue } from '../component/helper'\nexport const result = componentValue\n",
    'owner/__tests__/consumer.ts': "import { value } from '../internal'\nexport const result = value\n",
    'outside-public.ts':
      `import { value, componentValue } from '${alias}/owner'\n` + 'export const result = value + componentValue\n',
    'outside-relative.ts': "import { value } from './owner/internal'\nexport const result = value\n",
    'outside-alias.ts': `import { value } from '${alias}/owner/internal'\nexport const result = value\n`,
    'outside-type.ts': `import type { InternalValue } from '${alias}/owner/internal'\nexport type Result = InternalValue\n`,
    'outside-component-barrel.ts': `import { componentValue } from '${alias}/owner/component'\nexport const result = componentValue\n`,
    'local/.scope.ts': `export default 'src/${fixtureName}/local'\n`,
    'local/value.ts': 'export const localValue = 3\n',
    'outside-local.ts': "import { localValue } from './local/value'\nexport const result = localValue\n",
  };
  const forbiddenImports = new Set([
    'owner/sibling.ts',
    'owner/other-component/consumer.ts',
    'outside-relative.ts',
    'outside-alias.ts',
    'outside-type.ts',
    'outside-component-barrel.ts',
    'outside-local.ts',
  ]);

  try {
    await Promise.all(
      Object.entries(fixtures).map(async ([relativePath, source]) => {
        const path = join(fixtureDirectory, relativePath);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, source);
      }),
    );
    const results = await lintProjectFiles(
      Object.keys(fixtures).map((path) => join(fixtureDirectory, path)),
      projectDirectory,
    );
    const byPath = new Map(results.map((result) => [result.filePath, result]));
    expect(results).toHaveLength(Object.keys(fixtures).length);

    for (const relativePath of Object.keys(fixtures)) {
      const result = byPath.get(join(fixtureDirectory, relativePath))!;
      expect(result.fatalErrorCount, relativePath).toBe(0);
      const violations = result.messages.filter(({ ruleId }) => ruleId === scopeRule);
      expect(violations.length, `${relativePath}: ${JSON.stringify(result.messages)}`).toBe(
        forbiddenImports.has(relativePath) ? 1 : 0,
      );
      expect(violations.every(({ severity }) => severity === 2)).toBe(true);
      if (relativePath.includes('.scope')) {
        expect(result.messages, relativePath).toEqual([]);
      }
    }
  } finally {
    await rm(fixtureDirectory, { recursive: true, force: true });
  }
}, 30_000);

test('real implementation scopes reject siblings and outsiders while exposing owner entries', async () => {
  const ticket = 'src/containers/ticket';
  const components = `${ticket}/components`;
  const cases = [
    {
      owner: `${components}/DepartureReveal`,
      entry: 'utils/departureBoardRows',
      exported: 'mockDepartureAt',
    },
    {
      owner: `${components}/DepartureReveal`,
      entry: 'hooks/useDepartureBoard',
      exported: 'useDepartureBoard',
    },
    {
      owner: `${components}/TicketIssuer/TicketPresentation`,
      entry: 'ticketTear',
      exported: 'ticketTearProgress',
    },
    {
      owner: `${components}/TicketIssuer/TicketPresentation`,
      entry: 'TicketPaperMesh',
      exported: 'TicketPaperMesh',
    },
    {
      owner: `${components}/CheckInForm`,
      entry: 'InputScreen',
      exported: 'InputScreen',
    },
    {
      owner: `${components}/ReissueConfirmModal`,
      entry: 'Modal',
      exported: 'Modal',
    },
    {
      owner: `${ticket}/services`,
      entry: 'firebaseTicketService',
      exported: 'createFirestoreTicketCall',
    },
  ];

  const fixtureDirectory = await mkdtemp(join(projectDirectory, 'src/scope-real-fixture-'));
  const fixtureName = basename(fixtureDirectory);
  const expected = new Map<string, number>();
  const createdFiles: string[] = [];
  const createProbe = async (directory: string, label: string, source: string, violations: number) => {
    const path = join(projectDirectory, directory, `${fixtureName}-${label}.ts`);
    await writeFile(path, source);
    createdFiles.push(path);
    expected.set(path, violations);
  };

  try {
    for (const [index, { owner, entry, exported }] of cases.entries()) {
      const source = `import { ${exported} } from '@/${owner.slice(4)}/${entry}'\nexport { ${exported} }\n`;
      await createProbe(owner, `owner-${index}`, source, 0);
      const sibling = owner.endsWith('/CheckInForm') ? `${components}/DepartureReveal` : `${components}/CheckInForm`;
      await createProbe(sibling, `sibling-${index}`, source, 1);
      await createProbe(dirname(owner), `parent-${index}`, source, 1);
      await createProbe('src/app', `outside-${index}`, source, 1);
    }

    const entries = [
      ['components/DepartureReveal', 'DepartureReveal'],
      ['components/CheckInForm', 'EmailScreen'],
      ['components/ReissueConfirmModal', 'ReissueConfirmModal'],
      ['components/TicketIssuer', 'TicketIssuer'],
      ['services', 'createTicketRuntime'],
    ];
    for (const [index, [entry, exported]] of entries.entries()) {
      await createProbe(
        ticket,
        `public-${index}`,
        `import { ${exported} } from '@/containers/ticket/${entry}'\nexport { ${exported} }\n`,
        0,
      );
    }
    await createProbe(
      `${components}/TicketIssuer`,
      'public-presentation',
      "import { TicketPresentation } from './TicketPresentation'\nexport { TicketPresentation }\n",
      0,
    );

    const results = await lintProjectFiles(createdFiles, projectDirectory);
    expect(results).toHaveLength(expected.size);
    for (const result of results) {
      expect(result.fatalErrorCount, result.filePath).toBe(0);
      const violations = result.messages.filter(({ ruleId }) => ruleId === scopeRule);
      expect(violations.length, `${result.filePath}: ${JSON.stringify(result.messages)}`).toBe(
        expected.get(result.filePath),
      );
      expect(violations.every(({ severity }) => severity === 2)).toBe(true);
    }
  } finally {
    await Promise.all(createdFiles.map((path) => rm(path, { force: true })));
    await rm(fixtureDirectory, { recursive: true, force: true });
  }
}, 30_000);
