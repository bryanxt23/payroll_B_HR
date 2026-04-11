/**
 * Role-based permission helpers.
 *
 * The source of truth is the `permissions` object returned by the backend
 * on login (see AuthController.login). It holds resolved booleans for
 * built-in AND custom roles, so we just read it directly. The hardcoded
 * fallbacks below cover users whose session predates this change.
 *
 * Built-in roles:
 *   Admin   — full access: view + add + edit + delete everywhere
 *   user    — view only, no mutations
 *   userS   — Sales: add + edit only (no delete)
 *   userI   — Inventory: add + edit only (no delete)
 *   userSI  — Sales + Inventory: add + edit only (no delete)
 *
 * Only Admin can delete anything (custom roles can also be granted delete).
 */

function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "null");
  } catch { return null; }
}

export function getRole() { return getUser()?.role || ""; }
export function isAdmin() { return getRole() === "Admin"; }

// Resolve a permission flag. Reads from the backend-supplied `permissions`
// object first; if it's missing (older session) falls back to the legacy
// hardcoded role list so existing logins keep working.
function check(flagName, fallbackRoles) {
  const user = getUser();
  if (user?.permissions && typeof user.permissions[flagName] === "boolean") {
    return user.permissions[flagName];
  }
  return fallbackRoles.includes(getRole());
}

// ── Sales ─────────────────────────────────────────────────────────
const LEGACY_SALES_ROLES = ["Admin", "userS", "userSI"];
export function canAddSales()    { return check("canAddSales",    LEGACY_SALES_ROLES); }
export function canEditSales()   { return check("canEditSales",   LEGACY_SALES_ROLES); }
export function canDeleteSales() { return check("canDeleteSales", ["Admin"]); }
export function canPaySales()    { return check("canEditSales",   LEGACY_SALES_ROLES); }

// ── Inventory ─────────────────────────────────────────────────────
const LEGACY_INV_ROLES = ["Admin", "userI", "userSI"];
export function canAddInventory()      { return check("canAddInventory",    LEGACY_INV_ROLES); }
export function canEditInventory()     { return check("canEditInventory",   LEGACY_INV_ROLES); }
export function canDeleteInventory()   { return check("canDeleteInventory", ["Admin"]); }
export function canManageCategories()  { return check("canAddInventory",    LEGACY_INV_ROLES); }
export function canDeleteCategories()  { return check("canDeleteInventory", ["Admin"]); }

// ── Role metadata (for display) ───────────────────────────────────
export const ROLE_LIST = [
  { value: "Admin",  label: "Admin",  desc: "Full access — view, add, edit, delete" },
  { value: "user",   label: "user",   desc: "View only — no add, edit, or delete" },
  { value: "userS",  label: "userS",  desc: "Sales only — add & edit (no delete)" },
  { value: "userI",  label: "userI",  desc: "Inventory only — add & edit (no delete)" },
  { value: "userSI", label: "userSI", desc: "Sales + Inventory — add & edit (no delete)" },
];
