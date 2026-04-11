// Shared store list — single source of truth for the header dropdown,
// Add Employee modal, and Settings rename UI.
//
// Names are persisted in localStorage so admins can rename stores without
// any backend changes. The base list (id + default name + subtitle) is fixed.

const BASE_STORES = [
  { id: 1, defaultName: "MR Styles Store 1", subtitle: "Jewelries, Accessories and More 1" },
  { id: 2, defaultName: "MR Styles Store 2", subtitle: "Jewelries, Accessories and More 2" },
  { id: 3, defaultName: "MR Styles Store 3", subtitle: "Jewelries, Accessories and More 3" },
  { id: 4, defaultName: "MR Styles Store 4", subtitle: "Jewelries, Accessories and More 4" },
  { id: 5, defaultName: "MR Styles Store 5", subtitle: "Jewelries, Accessories and More 5" },
];

const OVERRIDES_KEY = "storeNameOverrides";

function readOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeOverrides(map) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(map));
}

/** Returns the merged store list with any admin-renamed names applied. */
export function getStores() {
  const overrides = readOverrides();
  return BASE_STORES.map(s => ({
    id: s.id,
    name: overrides[s.id] || s.defaultName,
    subtitle: s.subtitle,
  }));
}

/** Rename a store. Pass an empty string to revert to the default. */
export function setStoreName(id, newName) {
  const overrides = readOverrides();
  const trimmed = (newName || "").trim();
  if (!trimmed) delete overrides[id];
  else overrides[id] = trimmed;
  writeOverrides(overrides);
}
