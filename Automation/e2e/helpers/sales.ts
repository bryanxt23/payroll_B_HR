import { expect, Page, Locator } from "@playwright/test";
import { fieldByLabel } from "./forms";

export class SalesPage {
  constructor(public page: Page) {}

  async goto() {
    await this.page.goto("/sales");
    await expect(this.page.getByRole("button", { name: /\+ Add Buyer/i }).first()).toBeVisible();
  }

  /**
   * Open the Add Buyer modal, fill the required fields, save.
   *
   * Note: "Item Purchased" is NOT a <select> — it's a button that opens a
   * separate "Choose Product" picker modal. We click the trigger, search
   * the picker, then click the matching item card.
   */
  async addBuyer(opts: {
    customerName: string;
    itemName: string;       // must match an existing inventory item name
    quantity?: number;
    paymentTerms?: "Cash" | "Layaway";
    team?: string;          // e.g. "Team A"
  }) {
    await this.page.getByRole("button", { name: /\+ Add Buyer/i }).first().click();
    await expect(this.page.getByRole("heading", { name: /add new buyer/i })).toBeVisible();

    const form = this.page.locator("form").filter({ has: this.page.getByText(/^Customer Name/i) }).first();

    await fieldByLabel(form, "Customer Name").fill(opts.customerName);

    // Pick the inventory item via the picker modal.
    await form.getByRole("button", { name: /select an item/i }).click();
    await expect(this.page.getByRole("heading", { name: /choose product/i })).toBeVisible();
    await this.page.getByPlaceholder(/search by name/i).fill(opts.itemName);
    // The picker row's onClick lives on the parent <div>; clicking the
    // visible name span bubbles up to it. exact: true keeps us from picking
    // a partial match in another picker row.
    await this.page.getByText(opts.itemName, { exact: true }).first().click();
    await expect(this.page.getByRole("heading", { name: /choose product/i })).toBeHidden({ timeout: 5_000 });

    if (opts.quantity != null) {
      await fieldByLabel(form, "Quantity").fill(String(opts.quantity));
    }
    if (opts.paymentTerms) {
      await fieldByLabel(form, "Payment Terms").selectOption({ label: opts.paymentTerms });
    }
    if (opts.team) {
      const teamSelect = fieldByLabel(form, "Team");
      if (await teamSelect.count() > 0) {
        await teamSelect.selectOption({ label: opts.team });
      }
    }

    // Submit button is disabled until selectedItem and totalPayable > 0.
    const submit = form.locator("button[type='submit']");
    await expect(submit).toBeEnabled({ timeout: 5_000 });
    await submit.click();

    await expect(this.page.getByRole("heading", { name: /add new buyer/i })).toBeHidden({ timeout: 10_000 });
    await expect(this.page.getByText(opts.customerName, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  }

  /** Click Pay on the row matching the customer name and confirm a payment. */
  async pay(customerName: string, amount: number, notes?: string) {
    const row = this.rowByCustomer(customerName);
    await row.getByRole("button", { name: /^Pay$/ }).click();

    await expect(this.page.getByRole("heading", { name: /payment/i }).first()).toBeVisible();
    const form = this.page.locator("form").filter({ has: this.page.getByText(/amount/i) }).last();

    await fieldByLabel(form, "Amount").fill(String(amount));
    if (notes) {
      const notesInput = fieldByLabel(form, "Notes");
      if (await notesInput.count() > 0) await notesInput.fill(notes);
    }
    await this.page.getByRole("button", { name: /confirm payment/i }).click();
    await expect(this.page.getByRole("heading", { name: /payment/i }).first()).toBeHidden({ timeout: 10_000 });
  }

  async deleteBuyer(customerName: string) {
    const row = this.rowByCustomer(customerName);
    if (!(await row.isVisible().catch(() => false))) return;
    this.page.once("dialog", d => d.accept());
    await row.locator("button[title='Delete'], button:has-text('🗑')").first().click();
    await expect(row).toBeHidden({ timeout: 10_000 });
  }

  private rowByCustomer(customerName: string): Locator {
    // Walk up from the customer name text to the closest ancestor that
    // contains a Pay button. This is the actual row, not an outer container
    // that wraps multiple rows.
    return this.page
      .getByText(customerName, { exact: false })
      .first()
      .locator("xpath=ancestor::*[.//button[normalize-space()='Pay']][1]");
  }
}
