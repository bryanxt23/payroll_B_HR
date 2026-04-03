/**
 * Role-based permission helpers.
 *
 * Roles:
 *   Admin   — full access: view + add + edit + delete everywhere
 *   user    — view only, no mutations
 *   userS   — Sales: add + edit only (no delete)
 *   userI   — Inventory: add + edit only (no delete)
 *   userSI  — Sales + Inventory: add + edit only (no delete)
 *
 * Only Admin can delete anything.
 */

function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "null");
  } catch { return null; }
}

export function getRole() { return getUser()?.role || ""; }
export function isAdmin() { return getRole() === "Admin"; }

// ── Sales ─────────────────────────────────────────────────────────
const SALES_ROLES = ["Admin", "userS", "userSI"];
export function canAddSales()    { return SALES_ROLES.includes(getRole()); }
export function canEditSales()   { return SALES_ROLES.includes(getRole()); }
export function canDeleteSales() { return isAdmin(); }
export function canPaySales()    { return SALES_ROLES.includes(getRole()); }

// ── Inventory ─────────────────────────────────────────────────────
const INV_ROLES = ["Admin", "userI", "userSI"];
export function canAddInventory()      { return INV_ROLES.includes(getRole()); }
export function canEditInventory()     { return INV_ROLES.includes(getRole()); }
export function canDeleteInventory()   { return isAdmin(); }
export function canManageCategories()  { return INV_ROLES.includes(getRole()); }  // add + rename
export function canDeleteCategories()  { return isAdmin(); }

// ── Role metadata (for display) ───────────────────────────────────
export const ROLE_LIST = [
  { value: "Admin",  label: "Admin",  desc: "Full access — view, add, edit, delete" },
  { value: "user",   label: "user",   desc: "View only — no add, edit, or delete" },
  { value: "userS",  label: "userS",  desc: "Sales only — add & edit (no delete)" },
  { value: "userI",  label: "userI",  desc: "Inventory only — add & edit (no delete)" },
  { value: "userSI", label: "userSI", desc: "Sales + Inventory — add & edit (no delete)" },
];
