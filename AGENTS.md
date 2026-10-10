# GDG Homecoming coding conventions

Keep `AGENTS.md` and `CLAUDE.md` equivalent. This project uses React 19, TypeScript, Vite, Tailwind CSS, Bun, and Firebase. Portable SkinSeoul coding conventions are adapted here; its business packages and Next.js APIs are not dependencies.

## Architecture and ownership

- `src/app` composes routes. Domain implementation belongs under its `src/containers/<domain>` owner.
- Domain-independent reusable UI belongs in `src/components/common`; shared domain UI belongs in `src/components/<domain>`. Single-owner code stays with its owner.
- Respect the existing domain and export-scope ESLint rules. Outside closed owners, use explicit public entry points. Do not widen scopes or expose internals to satisfy lint.
- Identify owners and intended importers before adding `.scope.default.ts` or barrels. Add only necessary boundaries and test both allowed and forbidden imports.
- Prefer functional, declarative code and early returns. Use named function components with explicit props, never `React.FC` or its aliases.

## Code and formatting

- No explicit `any`. Narrow `unknown` at trust boundaries. Prefer interfaces for object contracts, const maps over enums, and `satisfies` for conformance checks.
- Use camelCase variables/functions, PascalCase components/interfaces/types, and UPPER_CASE constants. Prefer descriptive props, `handle...` event handlers, and `is...`/`has...` booleans for new code.
- Always brace control-flow bodies. Use strict equality; intentional `== null` / `!= null` checks may handle both null and undefined.
- Use type-only imports. Simple arrays use `T[]`; complex element types may use `Array<T>`.
- Prefer named constants for meaningful repeated values. Check existing owner/shared utilities before adding helpers.
- Application code must not use `console.log`; supported diagnostic levels are configured in ESLint. CLI stdout is explicitly allowed. Never log credentials or participant emails.
- Preserve Hooks correctness, semantic HTML, labels, keyboard access, focus restoration, and reduced-motion behavior. A necessary rule exception must be narrow and explain the actual behavior.
- Prettier: semicolons, 120 columns, two spaces, single quotes, trailing commas, and the existing Tailwind sorting plugin.

## Workflow

- Preserve existing uncommitted work. Make changes in the currently assigned checkout; do not reset or delete unrelated files.
- Run `bun run check`, focused regression tests, and `bun run build` for code changes. Use `bun run test:firebase` for Firebase behavior and keep existing user emulator sessions intact.
- Tests should verify behavior or real lint acceptance/rejection, not mirror implementation text.
- Browser work follows the installed `aside-browser` skill. Local checks, CI success, and deployed runtime verification are separate evidence.
- Do not copy SkinSeoul routing wrappers, business packages, deployment policies, or design tokens into this project.

See [docs/coding-conventions.md](docs/coding-conventions.md) for enforcement and adaptations.
