# Agent Guidelines for react-nook

## Build/Test/Lint Commands
- **Test**: `pnpm test:unit:watch` (root) or `vitest` for single test runs
- **Build**: `pnpm -C packages/react-nook build` (uses tsdown)
- **Type check**: `pnpm -C packages/react-nook test:types` (tsc --noEmit)
- **Lint**: Uses Biome - run `biome check` or `biome format`
- **Next.js app**: `pnpm -C apps/next-gallery dev/build/lint`
- **Docs**: `pnpm -C apps/react-nook-docs dev/build`

## Code Style (Biome Config)
- **Indentation**: 2 spaces (not tabs)
- **Quotes**: Single quotes for JS/TS
- **Imports**: Remove unused imports (enforced)
- **JSX Runtime**: Transparent (import React explicitly when needed)
- **File extensions**: Use `.ts`/`.tsx` extensions in imports

## Naming & Patterns
- Nooks use `mount` prefix: `mountState`, `mountEffect`, `mountCallback`
- Template literal syntax: `mountState\`\`(initial)` for nook calls
- Regular function calls for components: `nook(() => ...)`
- Use `readonly` for state tuples: `readonly [T, Setter<T>]`

## Error Handling
- Throw descriptive errors with context
- Server-side: Return safe defaults (noop functions, initial values)
- Validate nook usage context before execution