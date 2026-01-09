# Two-Stage Testing - Live Validation

**Started:** January 8, 2026, 6:10 PM  
**Goal:** Prove the two-stage PR process works before sending more PRs upstream

---

## Why We're Doing This

We've sent too many broken PRs upstream. The lead is seeing constant failures. We need to:
1. ✅ **Prove our process works** by testing on fork first
2. ✅ **Build confidence** that our changes actually pass CI
3. ✅ **Stop wasting the lead's time** with failed PRs

---

## Current Fork PRs Being Tested

### Active Testing (Fork CI)

**PR #2: Contact Form Plugin**
- Branch: `feature/contact-plugin-v1`
- Fork PR: https://github.com/mmcintosh/sonicjs/pull/2
- Upstream PR: https://github.com/lane711/sonicjs/pull/445 (waiting)
- Status: 🟡 CI running with improved error logging
- What we're learning: Now exposes actual error messages

**PR #9: Sanitize.ts Type Fix** ⭐ NEW
- Branch: `refactor/types-sanitize`
- Fork PR: https://github.com/mmcintosh/sonicjs/pull/9
- Upstream PR: #494 (CLOSED - will recreate after fork passes)
- Status: 🟡 CI running
- Local tests: ALL PASSED ✅

---

## Recently Closed Fork PRs

**PR #7: AI Search Plugin** - CLOSED ✅
- Reason: Already passed fork CI (run 20821747357)
- Action: Updated wrangler.toml to upstream IDs on the branch
- Upstream PR #483: Ready for lead to test!
- Closed to prevent fork CI from running with upstream IDs (would fail)

**PR #6: Turnstile Plugin** - CLOSED ⏸️
- Reason: Never passed fork CI testing
- Issue: Has package-lock.json sync issues
- Need to fix and re-test on fork before updating for upstream

**PRs #1, #3, #4, #5, #8: any type fixes** - CLOSED
- Reason: Duplicate PRs (both fork and upstream existed)
- Only keeping upstream PRs #489-492

---

## The Two-Stage Process (Being Validated)

### Stage 1: Fork Testing (YOUR Resources) ⏳ IN PROGRESS
1. ✅ Make code changes
2. ✅ Ensure wrangler.toml has YOUR Cloudflare IDs:
   - KV: `f0814f19589a484da200cc3c3ba4d717`
   - R2: `sonicjs-ci-media`
   - D1: Created dynamically by CI
3. ✅ Run local tests (all passed for sanitize)
4. ✅ Create fork PR
5. ⏳ **Wait for fork CI to pass**
6. ⏳ Verify preview deployment works
7. ⏳ Close fork PR once confident

### Stage 2: Upstream PR (LEAD's Resources) ⏸️ NOT STARTED YET
1. ⏸️ Update wrangler.toml to UPSTREAM IDs:
   - KV: `a16f8246fc294d809c90b0fb2df6d363`
   - R2: `my-sonicjs-app-media`
2. ⏸️ Commit and push
3. ⏸️ Create upstream PR
4. ⏸️ Wait for upstream CI (may need lead approval)
5. ⏸️ Request review and merge

---

## Success Criteria

**Process is PROVEN when:**
- ✅ Sanitize PR #9 passes fork CI
- ✅ Contact Form PR #2 passes fork CI (after we fix the current error)
- ✅ We successfully update wrangler.toml and create upstream PR
- ✅ Upstream CI passes on first try

**Then we can:**
- Confidently process the remaining `any` type fixes
- Fix Turnstile and AI Search plugins
- Send PRs that actually work!

---

## Current CI Runs

Monitor at:
- Fork: https://github.com/mmcintosh/sonicjs/actions
- Upstream: https://github.com/lane711/sonicjs/actions

**Commands to check status:**
```bash
# Fork CI
gh run list --repo mmcintosh/sonicjs --limit 5

# Upstream CI (none running currently)
gh run list --repo lane711/sonicjs --limit 5
```

---

## Lessons Learned So Far

1. **Error handling matters:** Generic error messages hide root causes
2. **Wrangler.toml is critical:** Must match the CI environment's Cloudflare account
3. **Local tests aren't enough:** CI environment has different resources/state
4. **Two-stage testing is essential:** Can't skip fork testing and go straight to upstream
5. **Patience pays off:** Better to wait for proper testing than send broken PRs

---

## Next Actions

1. ⏳ **Wait for sanitize PR #9 CI** (~15-20 minutes)
2. ⏳ **Wait for contact form PR #2 CI** (~15-20 minutes)  
3. 📊 **Review results** and fix any issues
4. ✅ **Document success** or iterate on failures
5. 🎯 **Proceed with confidence** once proven

**No more upstream PRs until we prove this works!** 🎯
