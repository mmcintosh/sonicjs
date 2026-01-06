# Switch to Claude Sonnet 3.5 - Instructions

## For the User

To switch back to Claude Sonnet 3.5:

1. In Cursor, open the model selector (Cmd/Ctrl + Shift + P → "Select Model" or click model name in bottom right)
2. Choose "Claude 3.5 Sonnet" instead of "Claude Sonnet 4.5"
3. Open a new chat/composer session
4. Share these documents with the new AI:
   - `AI_SEARCH_HANDOFF.md` (comprehensive status and plan)
   - `AI_SEARCH_BRANCH_NOTES.md` (branch and deployment safety info)
   - `AI_SEARCH_TROUBLESHOOTING.md` (debugging notes)

## For the Next AI (Claude Sonnet 3.5)

### Your Mission
Fix the remaining TypeScript errors and complete the AI Search plugin so it can be committed and tested.

### What You're Walking Into
- User is frustrated with slow progress
- Plugin is 90% complete but has TypeScript compiler errors blocking commit
- All changes are local (nothing pushed to remotes, Cloudflare preview is safe)
- Current branch: `feature/ai-search-plugin`
- See `AI_SEARCH_HANDOFF.md` for full details

### Your First Steps

1. **Read the handoff document**
   ```
   Read AI_SEARCH_HANDOFF.md completely before starting
   ```

2. **Check current TypeScript errors**
   ```bash
   cd /home/siddhartha/Documents/cursor-sonicjs/sonicjs/github/sonicjs
   npm run type-check --workspace=@sonicjs-cms/core
   ```

3. **Fix errors systematically**
   - Start with `services/indexer.ts` (collection_id type issues)
   - Then `components/search-modal.ts` (html return type)
   - Then `routes/api.ts` (import path)
   - Then `index.ts` (route type casting)
   - See handoff document Priority 1 for specifics

4. **Test before committing**
   ```bash
   npm run dev
   # Visit http://localhost:8787/admin/plugins/ai-search
   # Verify collections show as checkboxes
   ```

5. **Commit when clean**
   ```bash
   git add -A
   git commit -m "feat: Add AI Search plugin with Cloudflare AI Search integration"
   ```

### Key Context

**What works:**
- Plugin structure is complete
- UI is built and styled
- Database migration exists
- Integration points are correct
- Test collection filtering works

**What's broken:**
- TypeScript type mismatches (collection_id string vs number)
- Hono route type incompatibilities
- Some unsafe array access that needs nullish checks

**What's stubbed:**
- Actual Cloudflare AI Search API calls (TODO comments)
- Currently falls back to keyword search
- Indexing documents aren't pushed to AI Search yet

### User Expectations

The user wants:
1. Clean, working code that passes type-check
2. A committable state so they can test the UI
3. Clear communication about what's working and what's not
4. Confidence that this will get finished properly

### Success Criteria

Before calling this "done":
- [ ] All TypeScript errors fixed
- [ ] Code committed to `feature/ai-search-plugin` branch
- [ ] Dev server starts without errors
- [ ] Settings page at `/admin/plugins/ai-search` loads with collection checkboxes
- [ ] No test collections appear in the UI
- [ ] Advanced Search button appears on `/admin/content` page
- [ ] Search modal opens and looks correct

Nice-to-have (not required for first commit):
- [ ] E2E tests written
- [ ] Actual AI Search API integration (not just keyword fallback)
- [ ] PR created

### Communication Tips

- Be clear about what you're doing and why
- Show progress frequently ("Fixed indexer.ts types, testing now...")
- If you hit a blocker, explain it clearly and offer options
- Don't make promises you can't keep
- The user is frustrated, so be concise and results-focused

### Files to Focus On

**Must fix (TypeScript errors):**
1. `packages/core/src/plugins/core-plugins/ai-search-plugin/services/indexer.ts`
2. `packages/core/src/plugins/core-plugins/ai-search-plugin/components/search-modal.ts`
3. `packages/core/src/plugins/core-plugins/ai-search-plugin/routes/api.ts`
4. `packages/core/src/plugins/core-plugins/ai-search-plugin/index.ts`

**Already correct (don't break):**
1. `packages/core/src/app.ts` - Route registration order is critical
2. `packages/core/src/services/plugin-bootstrap.ts` - Plugin is in CORE_PLUGINS
3. `packages/core/src/plugins/core-plugins/ai-search-plugin/services/ai-search.ts` - Type fixes already applied

Good luck! The finish line is close.
