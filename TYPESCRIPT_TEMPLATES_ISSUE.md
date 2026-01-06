# TypeScript Templates Issue - Separate PR Needed

## Issue

```
../templates/src/pages/admin-design.template.ts(1,68): error TS7016: 
Could not find a declaration file for module '@sonicjs-cms/core/templates'. 
'/home/siddhartha/Documents/cursor-sonicjs/sonicjs/github/sonicjs/packages/core/dist/templates.js' 
implicitly has an 'any' type.
```

## Root Cause

The `@sonicjs-cms/core` package exports templates but doesn't have proper TypeScript declaration files (`.d.ts`).

## Fix Needed

### Option 1: Generate Declaration Files
In `packages/core/tsconfig.json`:
```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": false
  }
}
```

### Option 2: Create Manual Declaration File
Create `packages/core/dist/templates.d.ts`:
```typescript
declare module '@sonicjs-cms/core/templates' {
  export * from '../src/templates'
}
```

### Option 3: Update Import Path
In `templates/src/pages/admin-design.template.ts`:
```typescript
// Change from:
import { renderAdminLayout } from '@sonicjs-cms/core/templates'

// To:
import { renderAdminLayout } from '../../../core/src/templates/layouts/admin-layout-v2.template'
```

## Impact

- **Current**: Type checking fails in pre-commit hook
- **Workaround**: Use `--no-verify` to skip hook
- **Priority**: Medium (doesn't affect runtime, only development)

## Related Files

- `packages/templates/src/pages/admin-design.template.ts`
- `packages/core/tsconfig.json`
- `packages/core/package.json` (exports field)

## Action

- [ ] Create separate PR to fix TypeScript declarations
- [ ] Test with `npm run type-check`
- [ ] Verify no other modules have same issue
- [ ] Update build process if needed

## Timeline

**This issue**: Discovered during AI Search plugin work
**Fix by**: Next PR (separate from AI Search feature)
**Assigned to**: TBD
