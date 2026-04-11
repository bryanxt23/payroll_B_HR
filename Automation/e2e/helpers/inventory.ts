import { expect, Page, Locator } from "@playwright/test";
import { fieldByLabel } from "./forms";

/**
 * Inventory page page-object.
 *
 * The app uses CSS modules with hashed class names, so selectors here key
 * off stable visible text and structural locators rather than class names.
 * Form labels are not bound to inputs in the markup, so we use
 * `fieldByLabel(modal, "Item Name")` instead of `getByLabel(...)`.
 */
export class InventoryPage {
  constructor(public page: Page) {}

  async goto() {
    await this.page.goto("/inventory");
    await expect(this.page.getByRole("button", { name: /\+ Add Item/i })).toBeVisible();
  }

  /**
   * Ensure a category exists in the sidebar. If the "New category..." input
   * is present, type the name and press Enter; if the category is already
   * listed, do nothing.
   */
  async ensureCategory(name: string) {
    const existing = this.page.locator("label").filter({ hasText: new RegExp(`^${escapeRegex(name)}\\s*\\d*$`) });
    if (await existing.count() > 0) return name;

    const newCatInput = this.page.getByPlaceholder(/new category/i);
    if (await newCatInput.isVisible().catch(() => false)) {
      await newCatInput.fill(name);
      await newCatInput.press("Enter");
      // Sidebar refreshes — wait for the new chip to appear.
      await expect(
        this.page.locator("label").filter({ hasText: new RegExp(`^${escapeRegex(name)}\\s*\\d*$`) })
      ).toHaveCount(1, { timeout: 5_000 });
    }
    return name;
  }

  private modal(): Locator {
    // Add Item modal — title is unique on the page when it's open.
    return this.page.locator(":has(> h2)").filter({ has: this.page.getByRole("heading", { name: /add new item/i }) }).first();
  }

  /**
   * Open the Add Item modal, fill the required fields, save.
   */
  async addItem(opts: {
    name: string;
    category: string;
    quantity: number;
    grams: number;
    cost: number;
    sellingPrice: number;
    supplier?: string;
  }) {
    await this.page.getByRole("button", { name: /\+ Add Item/i }).first().click();
    await expect(this.page.getByRole("heading", { name: /add new item/i })).toBeVisible();

    // The :has(> h2) trick can be flaky — just scope to the form element
    // inside the open modal.
    const form = this.page.locator("form").filter({ has: this.page.getByText(/^Item Name/i) }).first();

    await fieldByLabel(form, "Item Name").fill(opts.name);
    await fieldByLabel(form, "Category").selectOption({ label: opts.category });
    await fieldByLabel(form, "Quantity").fill(String(opts.quantity));
    await fieldByLabel(form, "Grams").fill(String(opts.grams));

    // Admin-only fields — present when logged in as admin.
    const supplier = fieldByLabel(form, "Supplier");
    if (await supplier.count() > 0) {
      await supplier.fill(opts.supplier || "Test Supplier");
    }
    const cost = fieldByLabel(form, "Cost");
    if (await cost.count() > 0) {
      await cost.fill(String(opts.cost));
    }

    await fieldByLabel(form, "Selling Price").fill(String(opts.sellingPrice));

    // Submit. The modal button is also "+ Add Item"; the page-level button
    // is hidden behind the modal overlay so .last() reliably picks the form's.
    await form.locator("button[type='submit']").click();

    // Modal closes and the row appears in the table.
    await expect(this.page.getByRole("heading", { name: /add new item/i })).toBeHidden({ timeout: 10_000 });
    await expect(this.page.getByText(opts.name, { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    return opts.name;
  }

  async deleteItem(name: string) {
    const row = this.page.locator("tr, [class*='row']").filter({ hasText: name }).first();
    if (!(await row.isVisible().catch(() => false))) return;
    this.page.once("dialog", d => d.accept());
    // Trash icon — the title attribute is "Delete".
    await row.locator("button[title='Delete']").click();
    await expect(this.page.getByText(name, { exact: true }).first()).toBeHidden({ timeout: 10_000 });
  }
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
