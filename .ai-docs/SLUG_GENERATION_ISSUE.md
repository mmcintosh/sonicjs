# URL Slug Auto-Generation Issue - Analysis & Solution

**Date:** January 9, 2026  
**Related Issues:** 
- #329: https://github.com/lane711/sonicjs/issues/329 (content: auto-populate slug from title)
- #323: https://github.com/lane711/sonicjs/issues/323 (Auto-generate URL slug from blog post title)

---

## 🎯 Problem Summary

The slug field should auto-generate from the title field, but the current implementation is **incomplete** and **inconsistent**.

### User Expectations

**When CREATING new content:**
1. Type in title → slug auto-generates
2. Stop auto-generating if user manually edits slug
3. Provide "Regenerate" button to re-sync slug from current title

**When EDITING existing content:**
1. Slug should NOT auto-change when title changes (prevent breaking URLs)
2. Still provide "Regenerate" button for manual refresh

---

## 🔍 Current Implementation Issues

### Issue #1: Two Different Implementations

**Location 1:** `packages/templates/src/pages/admin-content-new.template.ts` (lines 338-361)
```typescript
// Auto-generate slug from title
function generateSlug(title) {
  return title.toLowerCase()
    .replace(/[^\\w\\s-]/g, '')
    .replace(/\\s+/g, '-')
    .trim();
}

document.addEventListener('input', function(e) {
  if (e.target.name === 'title') {
    const slugField = document.querySelector('[name="slug"]');
    if (slugField && !slugField.dataset.manual) {
      slugField.value = generateSlug(e.target.value);
    }
  }
});

document.addEventListener('input', function(e) {
  if (e.target.name === 'slug') {
    e.target.dataset.manual = 'true';
  }
});
```

**Location 2:** `packages/core/src/templates/components/dynamic-field.template.ts` (lines 340-366)
```typescript
function generateSlugFromTitle(slugFieldId) {
  const titleField = document.querySelector('input[name="title"]');
  const slugField = document.getElementById(slugFieldId);
  if (titleField && slugField) {
    const slug = titleField.value
      .toLowerCase()
      .replace(/[^a-z0-9\\s_-]/g, '')
      .replace(/\\s+/g, '-')
      .replace(/[-_]+/g, '-')
      .replace(/^[-_]|[-_]$/g, '');
    slugField.value = slug;
  }
}

// Auto-generate slug when title changes
document.addEventListener('DOMContentLoaded', function() {
  const titleField = document.querySelector('input[name="title"]');
  const slugField = document.getElementById('${fieldId}');
  if (titleField && slugField && !slugField.value) {
    titleField.addEventListener('input', function() {
      if (!slugField.value) {
        generateSlugFromTitle('${fieldId}');
      }
    });
  }
});
```

**Problems:**
1. ❌ Different slug generation logic (different character handling)
2. ❌ Second implementation only runs if slug is empty
3. ❌ Conflicting event listeners
4. ❌ No "Regenerate" button

---

### Issue #2: Slug Generation Logic Inconsistency

**Implementation 1 allows:** `\w` (word chars) = letters, numbers, underscores  
**Implementation 2 allows:** Only `a-z0-9_-`

**Example difference:**
- Title: "Hello World! 2024"
- Implementation 1: "hello-world-2024"
- Implementation 2: "hello-world-2024"

Both mostly work, but Implementation 2 is more explicit.

---

### Issue #3: No Regenerate Button

Issue #329 explicitly requires:
> "Add a 'Regenerate slug' link/button under the slug input that rewrites it from the current title on demand."

**Currently missing!**

---

### Issue #4: Edit Mode Behavior Not Handled

When editing existing content:
- Slug should NOT auto-update (would break existing URLs)
- But regenerate button should still work

**Currently:** No distinction between create vs edit mode

---

### Issue #5: No Duplicate Slug Detection ⚠️ CRITICAL

**Currently:** No validation to prevent duplicate slugs within a collection!

**Problems:**
- Multiple content items can have same slug
- URLs collide → unpredictable behavior
- No user feedback about duplicates

**What's needed:**
- Real-time check as user types/generates slug
- Visual feedback: "❌ This slug is already in use"
- Prevent form submission if duplicate exists
- When editing: ignore current item's slug (it's not a duplicate of itself)

---

## ✅ Proposed Solution

### 1. **Add Duplicate Slug Detection API Endpoint**

**File:** `packages/core/src/routes/api-content-crud.ts` (ADD NEW ENDPOINT)

```typescript
// GET /api/content/check-slug?collectionId=xxx&slug=xxx&excludeId=xxx
// Returns: { available: boolean, message?: string }
apiContentCrudRoutes.get('/check-slug', async (c) => {
  try {
    const db = c.env.DB
    const collectionId = c.req.query('collectionId')
    const slug = c.req.query('slug')
    const excludeId = c.req.query('excludeId') // When editing, exclude current item
    
    if (!collectionId || !slug) {
      return c.json({ error: 'collectionId and slug are required' }, 400)
    }
    
    // Check for existing content with this slug
    let query = 'SELECT id FROM content WHERE collection_id = ? AND slug = ?'
    const params: any[] = [collectionId, slug]
    
    if (excludeId) {
      query += ' AND id != ?'
      params.push(excludeId)
    }
    
    const existing = await db.prepare(query).bind(...params).first()
    
    if (existing) {
      return c.json({ 
        available: false, 
        message: 'This URL slug is already in use in this collection' 
      })
    }
    
    return c.json({ available: true })
  } catch (error: any) {
    console.error('Error checking slug:', error)
    return c.json({ error: 'Failed to check slug availability' }, 500)
  }
})
```

**Note:** This endpoint should be public (or at least accessible during content creation).

---

### 2. **Consolidate Slug Generation Logic**

Create a single, canonical slug generation function in a shared utility:

**File:** `packages/core/src/utils/slug-utils.ts` (NEW)
```typescript
/**
 * Generate URL-friendly slug from text
 * @param text - Text to slugify
 * @returns URL-safe slug
 */
export function generateSlug(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .normalize('NFD') // Handle accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s_-]/g, '') // Keep only alphanumeric, spaces, underscores, hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[-_]+/g, '-') // Collapse multiple hyphens/underscores
    .replace(/^[-_]+|[-_]+$/g, '') // Trim leading/trailing hyphens/underscores
    .substring(0, 100); // Limit length
}
```

---

### 3. **Create Slug Field Component with Regenerate Button & Duplicate Detection**

Update `dynamic-field.template.ts` to render slug field with regenerate button and real-time duplicate checking:

```typescript
case 'slug':
  const slugHelp = opts.help || 'URL-friendly identifier (lowercase, letters, numbers, hyphens)'
  const slugPattern = opts.pattern || '^[a-z0-9_-]+$'
  
  fieldHTML = `
    <div class="slug-field-container">
      <input
        type="text"
        id="${fieldId}"
        name="${fieldName}"
        value="${escapeHtml(value)}"
        placeholder="${opts.placeholder || 'url-friendly-slug'}"
        maxlength="${opts.maxLength || 100}"
        data-pattern="${slugPattern}"
        class="${baseClasses} ${errorClasses}"
        ${required}
        ${disabled ? 'disabled' : ''}
        data-is-edit-mode="${!!value}"
        data-collection-id="${opts.collectionId || ''}"
        data-content-id="${opts.contentId || ''}"
      >
      <div id="${fieldId}-status" class="slug-status mt-1 text-sm"></div>
      <button 
        type="button" 
        class="regenerate-slug-btn mt-2 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
        onclick="regenerateSlugFromTitle('${fieldId}')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        Regenerate from title
      </button>
      ${slugHelp ? `<p class="text-xs text-gray-400 mt-1">${slugHelp}</p>` : ''}
    </div>
    
    <script>
      (function() {
        const slugField = document.getElementById('${fieldId}');
        const statusDiv = document.getElementById('${fieldId}-status');
        const isEditMode = slugField.dataset.isEditMode === 'true';
        const pattern = new RegExp('${slugPattern}');
        const collectionId = slugField.dataset.collectionId;
        const contentId = slugField.dataset.contentId; // When editing
        
        let checkTimeout;
        let lastCheckedSlug = '';
        
        // Check if slug is available
        async function checkSlugAvailability(slug) {
          if (!slug || !collectionId) return;
          
          // Don't check if it's the same as last time
          if (slug === lastCheckedSlug) return;
          lastCheckedSlug = slug;
          
          try {
            // Show checking status
            statusDiv.innerHTML = '<span class="text-gray-400">⏳ Checking availability...</span>';
            
            // Build URL
            let url = \`/api/content/check-slug?collectionId=\${encodeURIComponent(collectionId)}&slug=\${encodeURIComponent(slug)}\`;
            if (contentId) {
              url += \`&excludeId=\${encodeURIComponent(contentId)}\`;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.available) {
              statusDiv.innerHTML = '<span class="text-green-400">✓ Available</span>';
              slugField.setCustomValidity('');
            } else {
              statusDiv.innerHTML = \`<span class="text-red-400">✗ \${data.message || 'Already in use'}</span>\`;
              slugField.setCustomValidity(data.message || 'This slug is already in use');
            }
          } catch (error) {
            console.error('Error checking slug:', error);
            statusDiv.innerHTML = '<span class="text-yellow-400">⚠ Could not verify</span>';
          }
        }
        
        // Format validation
        slugField.addEventListener('input', function() {
          const value = this.value;
          
          // Clear status if empty
          if (!value) {
            statusDiv.innerHTML = '';
            this.setCustomValidity('');
            return;
          }
          
          // Pattern validation
          if (!pattern.test(value)) {
            this.setCustomValidity('Please use only lowercase letters, numbers, and hyphens.');
            statusDiv.innerHTML = '<span class="text-red-400">✗ Invalid format</span>';
            return;
          }
          
          // Debounce the availability check
          clearTimeout(checkTimeout);
          checkTimeout = setTimeout(() => {
            checkSlugAvailability(value);
          }, 500); // Wait 500ms after user stops typing
        });
        
        // Initial check if field has value
        if (slugField.value) {
          checkSlugAvailability(slugField.value);
        }
        
        // Auto-generate only in create mode
        if (!isEditMode) {
          const titleField = document.querySelector('input[name="title"]');
          if (titleField) {
            let manuallyEdited = false;
            
            titleField.addEventListener('input', function() {
              if (!manuallyEdited && !slugField.dataset.manualEdit) {
                regenerateSlugFromTitle('${fieldId}');
              }
            });
            
            slugField.addEventListener('input', function() {
              manuallyEdited = true;
            });
          }
        }
      })();
      
      // Global function for regenerate button
      window.regenerateSlugFromTitle = function(slugFieldId) {
        const titleField = document.querySelector('input[name="title"]');
        const slugField = document.getElementById(slugFieldId);
        if (titleField && slugField) {
          const slug = generateSlug(titleField.value);
          slugField.value = slug;
          slugField.dataset.manualEdit = 'false';
          
          // Trigger validation and duplicate check
          slugField.dispatchEvent(new Event('input', { bubbles: true }));
        }
      };
      
      // Shared slug generation function
      function generateSlug(text) {
        if (!text) return '';
        
        return text
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\\u0300-\\u036f]/g, '')
          .replace(/[^a-z0-9\\s_-]/g, '')
          .replace(/\\s+/g, '-')
          .replace(/[-_]+/g, '-')
          .replace(/^[-_]+|[-_]+$/g, '')
          .substring(0, 100);
      }
    </script>
  `
  break
```

---

### 4. **Update Content New/Edit Pages**

Remove duplicate slug logic from `admin-content-new.template.ts` since it's now handled in the field component.

**Also pass collection ID and content ID to the slug field:**

```typescript
// In admin-content-new.template.ts
const formData: FormData = {
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { 
      name: 'slug', 
      label: 'URL Slug', 
      type: 'slug', 
      required: true,
      collectionId: data.collectionId, // Pass collection ID
      contentId: data.contentId || '' // Pass content ID when editing
    },
    // ... other fields
  ]
}
```

---

### 5. **Prevent Form Submission with Duplicate Slug**

Add form-level validation:

```typescript
// In admin-content-new.template.ts or form handler
document.querySelector('form').addEventListener('submit', function(e) {
  const slugField = document.querySelector('input[name="slug"]');
  
  // Check if slug has validation error
  if (!slugField.validity.valid) {
    e.preventDefault();
    slugField.reportValidity();
    
    // Scroll to slug field
    slugField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    return false;
  }
});
```

---

### 6. **Add Playwright Test Coverage**

**File:** `tests/e2e/XX-slug-generation.spec.ts` (NEW)

```typescript
import { test, expect } from '@playwright/test'
import { loginAsAdmin, ensureAdminUserExists } from './utils/test-helpers'

test.describe('Slug Generation', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAdminUserExists(page)
    await loginAsAdmin(page)
  })

  test('should auto-generate slug from title when creating new content', async ({ page }) => {
    await page.goto('/admin/content/new?collectionId=blog-posts-collection')
    
    const titleField = page.locator('input[name="title"]')
    const slugField = page.locator('input[name="slug"]')
    
    // Type in title
    await titleField.fill('Hello World 2024!')
    
    // Wait for auto-generation
    await page.waitForTimeout(300)
    
    // Slug should auto-generate
    await expect(slugField).toHaveValue('hello-world-2024')
  })

  test('should stop auto-generating after manual edit', async ({ page }) => {
    await page.goto('/admin/content/new?collectionId=blog-posts-collection')
    
    const titleField = page.locator('input[name="title"]')
    const slugField = page.locator('input[name="slug"]')
    
    // Auto-generate first
    await titleField.fill('Hello World')
    await page.waitForTimeout(300)
    await expect(slugField).toHaveValue('hello-world')
    
    // Manually edit slug
    await slugField.fill('custom-slug')
    
    // Change title again
    await titleField.fill('Hello World 2024')
    await page.waitForTimeout(300)
    
    // Slug should NOT change
    await expect(slugField).toHaveValue('custom-slug')
  })

  test('should regenerate slug when button clicked', async ({ page }) => {
    await page.goto('/admin/content/new?collectionId=blog-posts-collection')
    
    const titleField = page.locator('input[name="title"]')
    const slugField = page.locator('input[name="slug"]')
    const regenerateBtn = page.locator('button:has-text("Regenerate from title")')
    
    // Set title and manually edit slug
    await titleField.fill('Hello World')
    await slugField.fill('custom-slug')
    
    // Update title
    await titleField.fill('New Title 2024')
    await page.waitForTimeout(300)
    
    // Slug still custom
    await expect(slugField).toHaveValue('custom-slug')
    
    // Click regenerate
    await regenerateBtn.click()
    
    // Slug should update from current title
    await expect(slugField).toHaveValue('new-title-2024')
  })

  test('should NOT auto-generate when editing existing content', async ({ page }) => {
    // First create content
    await page.goto('/admin/content/new?collectionId=blog-posts-collection')
    await page.fill('input[name="title"]', 'Original Title')
    await page.waitForTimeout(300)
    await page.click('button:has-text("Save")')
    await page.waitForTimeout(1000)
    
    // Find the content and edit it
    await page.goto('/admin/content?collectionId=blog-posts-collection')
    await page.click('a:has-text("Original Title")')
    
    const titleField = page.locator('input[name="title"]')
    const slugField = page.locator('input[name="slug"]')
    
    const originalSlug = await slugField.inputValue()
    
    // Change title
    await titleField.fill('Updated Title')
    await page.waitForTimeout(300)
    
    // Slug should NOT change (edit mode)
    await expect(slugField).toHaveValue(originalSlug)
  })

  test('should prevent duplicate slugs within collection', async ({ page }) => {
    // Create first content item
    await page.goto('/admin/content/new?collectionId=blog-posts-collection')
    await page.fill('input[name="title"]', 'Original Post')
    await page.waitForTimeout(300)
    
    const slugField = page.locator('input[name="slug"]')
    await expect(slugField).toHaveValue('original-post')
    
    // Should show as available
    await expect(page.locator('#slug-status')).toContainText('Available')
    
    await page.click('button:has-text("Save")')
    await page.waitForTimeout(1000)
    
    // Try to create second item with same slug
    await page.goto('/admin/content/new?collectionId=blog-posts-collection')
    await page.fill('input[name="title"]', 'Different Title')
    
    // Manually set duplicate slug
    await slugField.fill('original-post')
    await page.waitForTimeout(1000) // Wait for debounced check
    
    // Should show as unavailable
    await expect(page.locator('#slug-status')).toContainText('Already in use')
    
    // Try to submit - should fail
    await page.click('button:has-text("Save")')
    
    // Should still be on form (not navigate away)
    await expect(page).toHaveURL(/\/admin\/content\/new/)
  })

  test('should allow same slug in different collections', async ({ page }) => {
    // Create in blog-posts collection
    await page.goto('/admin/content/new?collectionId=blog-posts-collection')
    await page.fill('input[name="title"]', 'Test Post')
    await page.waitForTimeout(300)
    await page.click('button:has-text("Save")')
    await page.waitForTimeout(1000)
    
    // Create in pages collection with same slug - should be allowed
    await page.goto('/admin/content/new?collectionId=pages-collection')
    const slugField = page.locator('input[name="slug"]')
    await slugField.fill('test-post')
    await page.waitForTimeout(1000)
    
    // Should show as available (different collection)
    await expect(page.locator('#slug-status')).toContainText('Available')
  })

  test('should not flag own slug as duplicate when editing', async ({ page }) => {
    // Create content
    await page.goto('/admin/content/new?collectionId=blog-posts-collection')
    await page.fill('input[name="title"]', 'My Post')
    await page.waitForTimeout(300)
    await page.click('button:has-text("Save")')
    await page.waitForTimeout(1000)
    
    // Edit it
    await page.goto('/admin/content?collectionId=blog-posts-collection')
    await page.click('a:has-text("My Post")')
    
    const slugField = page.locator('input[name="slug"]')
    await expect(slugField).toHaveValue('my-post')
    
    // Status should show available (excluding self)
    await expect(page.locator('#slug-status')).toContainText('Available')
    
    // Should be able to save
    await page.click('button:has-text("Save")')
    await page.waitForTimeout(1000)
    
    // Should save successfully
    await expect(page).toHaveURL(/\/admin\/content/)
  })

  test('should regenerate work in edit mode', async ({ page }) => {
    // Create content
    await page.goto('/admin/content/new?collectionId=blog-posts-collection')
    await page.fill('input[name="title"]', 'Original Title')
    await page.waitForTimeout(300)
    await page.click('button:has-text("Save")')
    await page.waitForTimeout(1000)
    
    // Edit it
    await page.goto('/admin/content?collectionId=blog-posts-collection')
    await page.click('a:has-text("Original Title")')
    
    const titleField = page.locator('input[name="title"]')
    const slugField = page.locator('input[name="slug"]')
    const regenerateBtn = page.locator('button:has-text("Regenerate from title")')
    
    // Change title
    await titleField.fill('Brand New Title 2024')
    
    // Click regenerate
    await regenerateBtn.click()
    
    // Slug should update
    await expect(slugField).toHaveValue('brand-new-title-2024')
  })
})
```

---

## 📋 Implementation Checklist

- [ ] **API Endpoint:** Add `/api/content/check-slug` to `api-content-crud.ts`
- [ ] **Slug Utility:** Create `packages/core/src/utils/slug-utils.ts` with canonical `generateSlug()` function
- [ ] **Field Component:** Update `dynamic-field.template.ts`:
  - [ ] Add regenerate button
  - [ ] Add duplicate checking logic with debounce
  - [ ] Add visual status indicator
  - [ ] Fix auto-generation logic (create vs edit mode)
  - [ ] Add `collectionId` and `contentId` data attributes
- [ ] **Content Pages:** Update `admin-content-new.template.ts` and `admin-content-edit.template.ts`:
  - [ ] Remove duplicate slug generation logic
  - [ ] Pass `collectionId` and `contentId` to slug field
  - [ ] Add form-level validation to prevent submission with duplicate
- [ ] **Tests:** Create Playwright test file `tests/e2e/XX-slug-generation.spec.ts`:
  - [ ] Auto-generation on create
  - [ ] Stop after manual edit
  - [ ] Regenerate button works
  - [ ] Edit mode doesn't auto-change
  - [ ] Duplicate detection within collection
  - [ ] Same slug allowed in different collections
  - [ ] Editing doesn't flag own slug as duplicate
- [ ] **Local Testing:** Run `npm run e2e` to verify all tests pass
- [ ] **Documentation:** Update issues #329 and #323 with PR link
- [ ] **PR:** Create PR with two-stage testing process

---

## 🎯 Expected Outcome

After implementation:
✅ Auto-generation works on create  
✅ Stops after manual edit  
✅ Regenerate button available  
✅ Edit mode doesn't auto-change slug  
✅ **Real-time duplicate detection** with visual feedback  
✅ **Prevents duplicate URLs** within collections  
✅ Form submission blocked if duplicate detected  
✅ Editing own content doesn't flag as duplicate  
✅ Consistent slug format across codebase  
✅ Full E2E test coverage (8 test scenarios)

---

## 📊 User Experience Flow

### Creating New Content:
1. User types title: "My Awesome Post"
2. Slug auto-fills: "my-awesome-post"
3. After 500ms: "⏳ Checking availability..."
4. Result: "✓ Available" (green) or "✗ Already in use" (red)
5. If duplicate: Cannot submit form, must change slug

### Manual Override:
1. User manually edits slug
2. Auto-generation stops
3. Duplicate check still runs
4. Regenerate button always available

### Editing Existing:
1. Slug shows "✓ Available" (excludes self from check)
2. Title changes don't affect slug
3. Regenerate button works if needed

---

**Priority:** HIGH (user-facing feature, multiple open issues, prevents data integrity issues)  
**Complexity:** MEDIUM-HIGH (API endpoint + frontend + testing)  
**Estimated Time:** 3-4 hours (implementation + testing)

---

**Ready to implement?** This would close two upstream issues and provide a much better UX! 🚀
