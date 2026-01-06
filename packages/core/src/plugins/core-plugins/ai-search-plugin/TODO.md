# AI Search Plugin TODO

## Critical Issues (Fix Now)

- [ ] **Fix checkbox persistence bug** - checkboxes don't save
  - Added debug logging
  - Waiting for user console logs
  - Likely issue: form submission or database save
  
- [ ] **Fix test collection filtering** - test collections showing up again
  - Added more aggressive filtering
  - Need to verify which collections are in DB

## Missing for Cloudflare AI Search (Required)

### 1. Settings UI Updates
- [ ] Add "AI Search Instance Name" field
- [ ] Add "R2 Export Bucket" field  
- [ ] Add validation that instance exists
- [ ] Add "Test Connection" button

### 2. R2 Content Export Service
- [ ] Create `ContentExporter` service
- [ ] Export content as JSON/text to R2
- [ ] Handle incremental updates
- [ ] Monitor export status
- [ ] Error handling

### 3. Update AI Search Service
- [ ] Change from `env.AI.run()` to `env.AI.autorag(name).aiSearch()`
- [ ] Transform AI Search response format
- [ ] Handle metadata from AI Search
- [ ] Implement proper error handling
- [ ] Add fallback to keyword search

### 4. Index Manager Updates
- [ ] Export to R2 instead of local indexing
- [ ] Track R2 upload status
- [ ] Sync with AI Search index status
- [ ] Handle re-indexing

### 5. Wrangler Config
- [ ] Add AI_SEARCH_BUCKET R2 binding
- [ ] Document bucket creation process
- [ ] Add bucket to .env.example

### 6. Database Schema
- [ ] Add `ai_search_instance_name` to settings
- [ ] Add `ai_search_r2_bucket` to settings
- [ ] Track R2 export status per collection

## Implementation Priority

### Phase 1: Fix Current Bugs (TODAY)
1. Fix checkbox save
2. Fix test collection filtering
3. Get keyword search working 100%

### Phase 2: Add AI Search Instance Config (NEXT)
1. Add settings fields to UI
2. Add validation
3. Update types and schema
4. Save instance name to database

### Phase 3: Implement R2 Export (AFTER CONFIG)
1. Create ContentExporter service
2. Export selected collections to R2
3. Monitor export status
4. Update UI to show export progress

### Phase 4: Integrate AI Search API (FINAL)
1. Update searchAI() method
2. Use autorag() API
3. Transform responses
4. Test end-to-end
5. Deploy!

## Testing Plan

### Unit Tests
- [ ] ContentExporter service
- [ ] AI Search response transformation
- [ ] Settings validation

### Integration Tests
- [ ] R2 export flow
- [ ] AI Search query
- [ ] Fallback to keyword search

### E2E Tests
- [ ] Select collections → Export → Search
- [ ] AI mode vs keyword mode
- [ ] Error handling

## Documentation Needed

- [x] CLOUDFLARE_AI_SEARCH_SETUP.md (created)
- [x] CLOUDFLARE_CONFUSION.md (created)
- [ ] Update README.md with AI Search setup
- [ ] Add screenshots of dashboard setup
- [ ] Create video tutorial?

## Questions for User

1. **Do you want to create AI Search instance now or later?**
   - If now: Go to dashboard and create
   - If later: Focus on keyword search first

2. **Which R2 bucket should we use?**
   - Create new `sonicjs-ai-search-content`?
   - Or use existing `MEDIA_BUCKET`?

3. **What should we name the AI Search instance?**
   - Suggestion: `sonicjs-search`
   - Or: `{site-name}-search`

4. **Pricing acceptable?**
   - Free tier: 50 docs, 1000 queries/month
   - Paid: $5/mo for 5000 docs
   - Is this OK for your use case?
