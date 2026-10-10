import { describe, expect, test } from 'bun:test';
import { Linter } from 'eslint';
import plugin, { boundaryViolation } from '../scripts/eslint-domain-boundaries.mjs';

const root = '/workspace/src/example/src/';

describe('domain import boundaries', () => {
  test('APP → public container entries are allowed with aliases and relative paths', () => {
    for (const entry of [
      '@/containers/ticket',
      '@/containers/ticket/index.ts',
      '../containers/ticket',
      '@/containers/ticket/preview',
      '../containers/ticket/preview/index.ts',
    ]) {
      expect(boundaryViolation(`${root}app/App.tsx`, entry)).toBeNull();
    }
  });

  test('APP → private container files fail for aliases and relative paths', () => {
    for (const entry of [
      '@/containers/ticket/TicketContainer',
      '../containers/ticket/hooks/useTicket',
      '@/containers/ticket/preview/PreviewResult',
    ]) {
      expect(boundaryViolation(`${root}app/App.tsx`, entry)).not.toBeNull();
    }
  });

  test('OWNER → own implementation and shared dependencies remain allowed', () => {
    for (const entry of [
      './hooks/useTicket',
      '@/containers/ticket/components/TicketScreen',
      '@/components/common/Modal',
      '@/lib/firebase',
      'react',
    ]) {
      expect(boundaryViolation(`${root}containers/ticket/TicketContainer.tsx`, entry)).toBeNull();
    }
  });

  test('DOMAIN → another container fails even through its public entry', () => {
    for (const entry of ['@/containers/home', '../home/index', '@/containers/home/HomeContainer']) {
      expect(boundaryViolation(`${root}containers/ticket/TicketContainer.tsx`, entry)).toContain('another domain');
    }
  });

  test('SHARED → app and containers fail while CONTAINER → app also fails', () => {
    for (const owner of ['common', 'components', 'lib', 'styles']) {
      for (const entry of ['@/app/App', '@/containers/ticket']) {
        expect(boundaryViolation(`${root}${owner}/shared.ts`, entry)).toContain('Shared code');
      }
    }
    expect(boundaryViolation(`${root}containers/ticket/TicketContainer.tsx`, '../../app/App')).toContain(
      'app composition',
    );
  });

  test('PREVIEW → private files are accessible only within the preview owner', () => {
    const entry = '@/containers/ticket/preview/fixtures/departure';
    expect(boundaryViolation(`${root}containers/ticket/TicketContainer.tsx`, entry)).toContain('preview');
    expect(boundaryViolation(`${root}containers/ticket/preview/PreviewApp.tsx`, entry)).toBeNull();
    expect(boundaryViolation(`${root}containers/ticket/TicketContainer.tsx`, './preview')).toBeNull();
  });

  test('normalized paths cannot bypass private boundaries', () => {
    expect(boundaryViolation(`${root}app/App.tsx`, '@/containers/ticket/../home/private')).not.toBeNull();
    expect(boundaryViolation('C:\\workspace\\src\\app\\App.tsx', '../containers/ticket/private')).not.toBeNull();
  });

  test('ESLint checks imports, both re-export forms, and literal dynamic imports', () => {
    const linter = new Linter();
    for (const code of [
      "import { value } from '../containers/ticket/private';",
      "export { value } from '../containers/ticket/private';",
      "export * from '../containers/ticket/private';",
      "const load = () => import('../containers/ticket/private');",
    ]) {
      const messages = linter.verify(
        code,
        {
          plugins: { domains: plugin },
          rules: { 'domains/domain-boundaries': 'error' },
        },
        { filename: 'src/app/App.js' },
      );
      expect(messages).toHaveLength(1);
      expect(messages[0].ruleId).toBe('domains/domain-boundaries');
    }
    expect(
      linter.verify(
        "import { TicketContainer } from '../containers/ticket';",
        {
          plugins: { domains: plugin },
          rules: { 'domains/domain-boundaries': 'error' },
        },
        { filename: 'src/app/App.js' },
      ),
    ).toEqual([]);
  });
});
