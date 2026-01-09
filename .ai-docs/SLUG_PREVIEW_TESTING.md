# Slug Generation Preview Testing Guide

**Fork PR:** https://github.com/mmcintosh/sonicjs/pull/13  
**CI Run:** https://github.com/mmcintosh/sonicjs/actions/runs/20842396782  
**Status:** ⏳ CI Running (~20 min)

---

## 🎯 What to Test on Preview

Once CI completes, you'll get a preview URL in the PR comments. Test these scenarios:

### 1. **Auto-Generation (Create Mode)**
- Go to: `/admin/content/new?collectionId=pages-collection`
- Type in **Title** field: `My Test Page 2024`
- Watch **URL Slug** field auto-fill: `my-test-page-2024`
- Wait 500ms, see: `⏳ Checking availability...`
- Then see: `✓ Available` (green)

### 2. **Duplicate Detection**
- Create a page with title: `Homepage`
- Note the slug: `homepage`
- Save it
- Try to create ANOTHER page with slug: `homepage`
- Should see: `✗ This URL slug is already in use` (red)
- Try to submit → Should be BLOCKED

### 3. **Regenerate Button**
- Create new page
- Type title: `Original Title`
- Manually change slug to: `custom-slug`
- Change title to: `New Title`
- Slug should stay: `custom-slug` (doesn't auto-change)
- Click `🔄 Regenerate from title`
- Slug should update to: `new-title`

### 4. **Edit Mode (Existing Content)**
- Edit an existing page
- Change the title
- Slug should NOT auto-change
- But regenerate button should still work

### 5. **Collection Scoping**
- Create page with slug: `about` in Pages collection
- Create page with slug: `about` in different collection
- Should both be allowed (different collections)

### 6. **Special Characters**
- Type title with special chars: `Hello World! @#$% 2024`
- Slug should clean to: `hello-world-2024`
- Status should show: `✓ Available`

---

## ✅ Success Criteria

- [ ] Auto-generation works on create
- [ ] Stops auto-generating after manual edit
- [ ] Duplicate detection shows red error
- [ ] Form submission blocked on duplicate
- [ ] Regenerate button works
- [ ] Edit mode doesn't auto-change slugs
- [ ] Status indicators clear and accurate
- [ ] Special characters cleaned properly

---

## 🐛 If Issues Found

Document:
1. What you did (steps)
2. What you expected
3. What actually happened
4. Screenshot if helpful

Then I'll fix before creating upstream PR!

---

## 📊 Current Progress

**Done:**
- ✅ API endpoint working
- ✅ UI component complete
- ✅ Tested locally (success!)
- ✅ Type-check passed
- ✅ Committed and pushed
- ✅ Fork PR created
- ⏳ CI running...

**Next:**
- ⏳ Preview testing (you!)
- Then: Update to upstream IDs
- Then: Create upstream PR
- Then: 🎉 Done!

---

**ETA:** Check CI in ~20 minutes, preview URL will be in PR comments.
