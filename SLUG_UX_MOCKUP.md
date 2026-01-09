# Slug Duplicate Detection - Visual UX Flow

## 📱 What Users Will See

### Scenario 1: Available Slug (Happy Path)

```
┌─────────────────────────────────────────────────┐
│ Title *                                         │
│ ┌─────────────────────────────────────────────┐ │
│ │ My Awesome Blog Post                        │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ URL Slug *                                      │
│ ┌─────────────────────────────────────────────┐ │
│ │ my-awesome-blog-post                        │ │
│ └─────────────────────────────────────────────┘ │
│ ✓ Available                       [green text]  │
│ 🔄 Regenerate from title          [blue link]   │
│ Use letters, numbers, and hyphens only          │
└─────────────────────────────────────────────────┘
```

---

### Scenario 2: Checking (Debouncing)

```
┌─────────────────────────────────────────────────┐
│ URL Slug *                                      │
│ ┌─────────────────────────────────────────────┐ │
│ │ hello-world█                                │ │  ← User typing
│ └─────────────────────────────────────────────┘ │
│ ⏳ Checking availability...       [gray text]   │
│ 🔄 Regenerate from title          [blue link]   │
└─────────────────────────────────────────────────┘
```

---

### Scenario 3: Duplicate Detected ⚠️

```
┌─────────────────────────────────────────────────┐
│ URL Slug *                                      │
│ ┌─────────────────────────────────────────────┐ │
│ │ hello-world                                 │ │  ← Red border
│ └─────────────────────────────────────────────┘ │
│ ✗ This URL slug is already in use  [red text]  │
│ 🔄 Regenerate from title          [blue link]   │
│ Use letters, numbers, and hyphens only          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ [Save]  [Cancel]                   [gray button]│  ← Save disabled/blocked
└─────────────────────────────────────────────────┘
```

---

### Scenario 4: Invalid Format

```
┌─────────────────────────────────────────────────┐
│ URL Slug *                                      │
│ ┌─────────────────────────────────────────────┐ │
│ │ Hello World! @#$                            │ │  ← Red border
│ └─────────────────────────────────────────────┘ │
│ ✗ Invalid format                    [red text]  │
│ 🔄 Regenerate from title          [blue link]   │
│ Use letters, numbers, and hyphens only          │
└─────────────────────────────────────────────────┘
```

---

### Scenario 5: Edit Mode (Own Slug)

```
┌─────────────────────────────────────────────────┐
│ Title *                                         │
│ ┌─────────────────────────────────────────────┐ │
│ │ Updated Title for My Post                   │ │  ← Title changed
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ URL Slug *                                      │
│ ┌─────────────────────────────────────────────┐ │
│ │ my-awesome-blog-post                        │ │  ← Slug unchanged
│ └─────────────────────────────────────────────┘ │
│ ✓ Available                       [green text]  │  ← Not flagged as duplicate
│ 🔄 Regenerate from title          [blue link]   │  ← Click to sync with new title
└─────────────────────────────────────────────────┘

Note: Slug doesn't auto-update in edit mode to preserve existing URLs
```

---

## 🎨 Status Messages Reference

### Success States
- `✓ Available` - Green (#10b981)
- Slug is unique and valid

### Warning States
- `⏳ Checking availability...` - Gray (#9ca3af)
- Debouncing check in progress

### Error States
- `✗ This URL slug is already in use` - Red (#ef4444)
- `✗ Invalid format` - Red (#ef4444)
- `⚠ Could not verify` - Yellow (#f59e0b) - Network error

---

## 🔄 Regenerate Button Behavior

**Visual:** 
- Blue text (#60a5fa)
- Hover: Lighter blue (#93c5fd)
- Icon: Circular arrows (refresh)

**Behavior:**
1. Click button
2. Slug regenerates from current title
3. Auto-checks for duplicates
4. Updates status indicator
5. Re-enables auto-generation if it was stopped

---

## ⚡ Real-Time Behavior

### Timing
- **Debounce:** 500ms after user stops typing
- **Check time:** ~100-300ms (API round-trip)
- **Total:** ~600-800ms from last keystroke to result

### Smart Checking
- ✅ Only checks when slug value changes
- ✅ Caches last check to avoid duplicates
- ✅ Excludes current item ID when editing
- ✅ Scoped to collection (different collections = OK)

---

## 🚫 Form Submission Blocking

### When Duplicate Detected:

```javascript
// User clicks Save button
form.addEventListener('submit', function(e) {
  if (slugField has duplicate error) {
    e.preventDefault();
    
    // Show browser validation message
    slugField.reportValidity(); 
    // → "This URL slug is already in use"
    
    // Scroll to slug field
    slugField.scrollIntoView({ behavior: 'smooth' });
    
    return false; // Block submission
  }
});
```

**User sees:**
1. Form doesn't submit
2. Browser tooltip shows error
3. Page scrolls to slug field
4. Red highlight on field
5. Status message visible

---

## ✅ User Journey Summary

### Creating New Content
1. Type title → slug auto-generates ✓
2. Wait 500ms → checking... ⏳
3. See result → ✓ Available or ✗ In use
4. If duplicate → must change slug
5. If available → can save

### Manual Override
1. Edit slug field → auto-generation stops
2. Still checks for duplicates ✓
3. Can click regenerate anytime
4. Must resolve duplicates before save

### Editing Existing
1. Title changes → slug stays same ✓
2. Own slug shows as available ✓
3. Can regenerate if needed
4. Duplicate check works for new slugs

---

## 🎯 Key Benefits

1. **Prevents URL collisions** - No duplicate URLs possible
2. **Real-time feedback** - User knows immediately
3. **Clear messaging** - Obvious what's wrong
4. **Non-blocking** - Doesn't prevent typing
5. **Smart validation** - Only blocks submission
6. **Edit-friendly** - Doesn't interfere with updates
7. **Collection-scoped** - Same slug OK in different collections

---

**This is enterprise-grade UX!** 🚀
