import { Locator } from "@playwright/test";

/**
 * The app's form labels are NOT bound to their inputs (no `htmlFor` / `id`),
 * so Playwright's `getByLabel` finds nothing. Each field is rendered as
 *
 *   <div class="formField">
 *     <label class="formLabel">Quantity *</label>
 *     <input ...> | <select ...> | <textarea ...> | <button ...>
 *   </div>
 *
 * This helper finds the label by visible text inside `root` and returns the
 * first form control sibling under the same parent. Trailing " *" required
 * markers are stripped automatically — pass `"Quantity"`, not `"Quantity *"`.
 */
export function fieldByLabel(root: Locator, label: string): Locator {
  // Use xpath: find a label whose normalized text starts with the given label,
  // then walk up to its parent and pick the first input/select/textarea/button.
  const safe = label.replace(/"/g, '\\"');
  return root.locator(
    `xpath=.//label[starts-with(normalize-space(.), "${safe}")]` +
      `/parent::*/*[self::input or self::select or self::textarea or self::button][1]`
  ).first();
}
