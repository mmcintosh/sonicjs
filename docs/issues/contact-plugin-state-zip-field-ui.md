# Contact Plugin: State/Zip Field UI Issue

**Status:** Open  
**Priority:** Low  
**Created:** January 21, 2026  
**Component:** Contact Form Plugin - Settings UI  
**Affected Version:** 1.0.0

---

## Problem Description

In the Contact Form plugin's settings page, the State and Zip Code fields are currently combined/blended into a single "State / Zip" field presentation. This creates a confusing user experience and doesn't follow standard address form conventions.

## Current Behavior

- State and Zip Code fields appear to be merged or share a single label
- The visual presentation suggests they are a combined field when they should be separate
- This makes it unclear to users which field is for state and which is for zip code

## Expected Behavior

- State field should be clearly labeled and separate
- Zip Code field should be clearly labeled and separate
- Each field should have its own distinct label and input area
- Visual layout should follow standard address form conventions:
  ```
  [Street Address] ___________________
  [City] _____________ [State] ____ [Zip] _______
  ```

## Impact

- **User Experience:** Confusing form layout
- **Data Entry:** Users may be unsure where to enter state vs zip code
- **Visual Design:** Inconsistent with standard address form patterns

## Location

**File:** `/my-sonicjs-app/src/plugins/contact-form/components/settings-page.ts`

The settings form rendering logic needs to be reviewed to ensure state and zip code fields are properly separated in the HTML output.

## Reproduction Steps

1. Navigate to Admin → Plugins
2. Install and activate the Contact Form plugin
3. Click "Settings" on the Contact Form plugin
4. Observe the company information address fields
5. Notice the State/Zip field presentation issue

## Proposed Solution

Review the `settings-page.ts` component to:
1. Ensure separate `<label>` elements for state and zip fields
2. Use proper grid/flexbox layout to position them side-by-side
3. Add appropriate spacing and width constraints
4. Consider standard address form patterns (state: 2-char dropdown/input, zip: 5-10 chars)

## Related Files

- `/my-sonicjs-app/src/plugins/contact-form/components/settings-page.ts` - Settings UI component
- `/my-sonicjs-app/src/plugins/contact-form/types.ts` - Settings type definitions

## Notes

- This is a cosmetic/UX issue and doesn't affect functionality
- Current fix focus is on core plugin installation and route mounting
- Can be addressed in a future iteration or separate PR
- Consider reviewing entire settings form layout for other potential improvements

---

**Labels:** `ui`, `enhancement`, `contact-plugin`, `low-priority`
