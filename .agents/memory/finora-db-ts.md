---
name: Finora TypeScript DB fix after schema additions
description: After adding new schema tables to lib/db, must run tsc manually to regenerate declaration files
---

## Rule
Any new file added to lib/db/src/schema/ must be:
1. Exported in lib/db/src/schema/index.ts
2. Compiled: `cd lib/db && pnpm exec tsc -p tsconfig.json`

The db package has no "build" script in package.json — run tsc directly.
This is a composite TS project (emitDeclarationOnly: true, outDir: dist).

**Why:** Without the .d.ts output, workspace packages get "Module has no exported member" TypeScript errors
even though the source exports are correct. Happened with payments.ts table addition.
