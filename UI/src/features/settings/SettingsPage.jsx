import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./SettingsPage.module.css";
import API from "../../config";
import { getStores, setStoreName } from "../../utils/stores";

const BUILTIN_ROLES = new Set(["Admin", "user", "userS", "userI", "userSI"]);

const BUILTIN_ROLE_DESCS = [
  { name: "Admin",  desc: "Full access (add, edit, delete) — all stores, manages users & roles", badge: styles.badgeAdmin },
  { name: "user",   desc: "View only — no add, edit, or delete",                                 badge: styles.badgeUser },
  { name: "userS",  desc: "Sales only — add & edit (no delete)",                                 badge: styles.badgeUserS },
  { name: "userI",  desc: "Inventory only — add & edit (no delete)",                             badge: styles.badgeUserI },
  { name: "userSI", desc: "Sales + Inventory — add & edit (no delete)",                          badge: styles.badgeUserSI },
];


const EMPTY_USER = { username: "", email: "", password: "", role: "user", allowedStores: "", employeeCode: "" };
const EMPTY_ROLE = {
  name: "",
  canAddSales: false, canEditSales: false, canDeleteSales: false,
  canAddInventory: false, canEditInventory: false, canDeleteInventory: false,
};

function getMe() {
  try { return JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "null"); }
  catch { return null; }
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const me       = getMe();

  useEffect(() => {
    if (!me || me.role !== "Admin") navigate("/dashboard", { replace: true });
  }, []); // eslint-disable-line

  const [tab, setTab] = useState("users");

  const [users,         setUsers]         = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUser,      setEditUser]      = useState(null);
  const [userForm,      setUserForm]      = useState(EMPTY_USER);
  const [userSaving,    setUserSaving]    = useState(false);
  const [userError,     setUserError]     = useState("");

  const [employees,     setEmployees]     = useState([]);

  const [roles,         setRoles]         = useState([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editRole,      setEditRole]      = useState(null);
  const [roleForm,      setRoleForm]      = useState(EMPTY_ROLE);
  const [roleSaving,    setRoleSaving]    = useState(false);
  const [roleError,     setRoleError]     = useState("");

  // Stores — names are persisted in localStorage via the shared util
  const [stores,        setStores]        = useState(() => getStores());
  const [storeDrafts,   setStoreDrafts]   = useState(() => {
    const map = {};
    getStores().forEach(s => { map[s.id] = s.name; });
    return map;
  });
  const [storeSavedId,  setStoreSavedId]  = useState(null);

  // Cloudinary cleanup
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [cleanupResult,  setCleanupResult]  = useState(null);
  const [cleanupError,   setCleanupError]   = useState("");

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchEmployees();
  }, []); // eslint-disable-line

  const fetchUsers = () =>
    fetch(`${API}/api/users`).then(r => r.json())
      .then(d => {
        if (!Array.isArray(d)) return;
        d.sort((a, b) => {
          const order = { Admin: 0 };
          return (order[a.role] ?? 99) - (order[b.role] ?? 99) || a.username.localeCompare(b.username);
        });
        setUsers(d);
      }).catch(() => {});

  const fetchRoles = () =>
    fetch(`${API}/api/roles`).then(r => r.json())
      .then(d => setRoles(Array.isArray(d) ? d : [])).catch(() => {});

  const fetchEmployees = () =>
    fetch(`${API}/api/employees`).then(r => r.json())
      .then(d => setEmployees(Array.isArray(d) ? d : [])).catch(() => {});

  const availableRoles = [
    "Admin", "user", "userS", "userI", "userSI",
    ...roles.map(r => r.name).filter(n => !BUILTIN_ROLES.has(n)),
  ];

  // Admin always has all stores; other roles can be restricted per store
  const roleNeedsStores = (role) => role !== "Admin";

  const parseAllowed = (str) => str ? str.split(",").map(s => s.trim()).filter(Boolean) : [];
  const toggleStore  = (storeId, currentStr) => {
    const ids = parseAllowed(currentStr);
    const sid = String(storeId);
    const next = ids.includes(sid) ? ids.filter(i => i !== sid) : [...ids, sid];
    return next.join(",");
  };

  const roleBadgeClass = (role) => {
    const found = BUILTIN_ROLE_DESCS.find(r => r.name === role);
    return found ? found.badge : styles.badgeCustom;
  };

  const storeLabel = (sid) => {
    const store = stores.find(s => String(s.id) === sid.trim());
    return store ? store.name : `Store ${sid}`;
  };

  // ── Store rename ──────────────────────────────────────────────────
  const handleSaveStore = (id) => {
    setStoreName(id, storeDrafts[id]);
    const refreshed = getStores();
    setStores(refreshed);
    const map = {};
    refreshed.forEach(s => { map[s.id] = s.name; });
    setStoreDrafts(map);
    setStoreSavedId(id);
    setTimeout(() => setStoreSavedId(null), 1500);
  };
  // ── Cloudinary cleanup ────────────────────────────────────────────
  const handleCleanupCloudinary = async () => {
    if (!window.confirm(
      "Scan Cloudinary and delete duplicate inventory images?\n\n" +
      "For each set of images sharing the same original filename, the " +
      "newest one is kept and the rest are deleted. Images currently " +
      "used by an inventory item are always preserved.\n\n" +
      "This cannot be undone."
    )) return;

    setCleanupRunning(true);
    setCleanupError("");
    setCleanupResult(null);
    try {
      const r = await fetch(`${API}/api/inventory/cleanup-duplicates`, {
        method: "POST",
        headers: { "X-User-Role": me?.role || "" },
      });
      const data = await r.json();
      if (!r.ok || data.error) {
        setCleanupError(data.error || `Request failed (${r.status})`);
      } else {
        setCleanupResult(data);
      }
    } catch (e) {
      setCleanupError("Request failed: " + (e.message || "unknown"));
    } finally {
      setCleanupRunning(false);
    }
  };

  const handleResetStore = (id) => {
    setStoreName(id, "");
    const refreshed = getStores();
    setStores(refreshed);
    const map = {};
    refreshed.forEach(s => { map[s.id] = s.name; });
    setStoreDrafts(map);
  };

  // ── User CRUD ─────────────────────────────────────────────────────
  const openAddUser  = () => { setUserForm(EMPTY_USER); setEditUser(null); setUserError(""); setShowUserModal(true); };
  const openEditUser = (u) => {
    setUserForm({ username: u.username, email: u.email || "", password: "", role: u.role, allowedStores: u.allowedStores || "", employeeCode: u.employeeCode || "" });
    setEditUser(u); setUserError(""); setShowUserModal(true);
  };
  const closeUserModal = () => { setShowUserModal(false); setEditUser(null); setUserForm(EMPTY_USER); setUserError(""); };

  const handleSaveUser = (e) => {
    e.preventDefault();
    if (!editUser && userForm.username.toLowerCase() === "admin") {
      setUserError("Username 'admin' is reserved and cannot be created.");
      return;
    }
    if (roleNeedsStores(userForm.role) && !userForm.employeeCode) {
      setUserError("Please link this user to an employee. Create the employee first in the People page.");
      return;
    }
    setUserSaving(true); setUserError("");
    const url    = editUser ? `${API}/api/users/${editUser.id}` : `${API}/api/users`;
    const method = editUser ? "PUT" : "POST";
    const body   = { ...userForm };
    if (editUser && !body.password) delete body.password;
    if (!roleNeedsStores(body.role)) { body.allowedStores = ""; body.employeeCode = ""; }

    fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(() => { fetchUsers(); closeUserModal(); })
      .catch(() => setUserError("Username may already exist or fields are invalid."))
      .finally(() => setUserSaving(false));
  };

  const handleDeleteUser = (u) => {
    if (u.username === me.username) { alert("Cannot delete your own account."); return; }
    if (!window.confirm(`Delete user "${u.username}"?`)) return;
    fetch(`${API}/api/users/${u.id}`, { method: "DELETE" }).then(() => fetchUsers()).catch(() => {});
  };

  // ── Role CRUD ─────────────────────────────────────────────────────
  const openAddRole  = () => { setRoleForm(EMPTY_ROLE); setEditRole(null); setRoleError(""); setShowRoleModal(true); };
  const openEditRole = (r) => { setRoleForm({ ...r }); setEditRole(r); setRoleError(""); setShowRoleModal(true); };
  const closeRoleModal = () => { setShowRoleModal(false); setEditRole(null); setRoleForm(EMPTY_ROLE); setRoleError(""); };

  const handleSaveRole = (e) => {
    e.preventDefault(); setRoleSaving(true); setRoleError("");
    const url    = editRole ? `${API}/api/roles/${editRole.id}` : `${API}/api/roles`;
    const method = editRole ? "PUT" : "POST";
    fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(roleForm) })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(() => { fetchRoles(); closeRoleModal(); })
      .catch(() => setRoleError("Role name may already exist."))
      .finally(() => setRoleSaving(false));
  };

  const handleDeleteRole = (r) => {
    if (!window.confirm(`Delete role "${r.name}"? Users with this role will lose their permissions.`)) return;
    fetch(`${API}/api/roles/${r.id}`, { method: "DELETE" }).then(() => fetchRoles()).catch(() => {});
  };

  const PERM_FIELDS = [
    { key: "canAddSales",        label: "Can add items in Sales" },
    { key: "canEditSales",       label: "Can edit items in Sales" },
    { key: "canDeleteSales",     label: "Can delete items in Sales" },
    { key: "canAddInventory",    label: "Can add items in Inventory" },
    { key: "canEditInventory",   label: "Can edit items in Inventory" },
    { key: "canDeleteInventory", label: "Can delete items in Inventory" },
  ];

  if (!me || me.role !== "Admin") return null;

  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.sub}>Manage users and roles.</p>
        </div>
        <div className={styles.tabBar}>
          <button className={`${styles.tabBtn} ${tab === "users" ? styles.tabActive : ""}`} onClick={() => setTab("users")}>Users</button>
          <button className={`${styles.tabBtn} ${tab === "roles" ? styles.tabActive : ""}`} onClick={() => setTab("roles")}>Roles</button>
          <button className={`${styles.tabBtn} ${tab === "stores" ? styles.tabActive : ""}`} onClick={() => setTab("stores")}>Stores</button>
          <button className={`${styles.tabBtn} ${tab === "maintenance" ? styles.tabActive : ""}`} onClick={() => setTab("maintenance")}>Maintenance</button>
        </div>
      </div>

      {/* ══ USERS TAB ══════════════════════════════════════════════ */}
      {tab === "users" && (
        <>
          <div className={styles.sectionHeader}>
            <span>User Accounts ({users.length})</span>
            <button className={styles.addBtn} onClick={openAddUser}>+ Add User</button>
          </div>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Allowed Stores</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={u.username === me.username ? styles.selfRow : ""}>
                    <td className={styles.nameCell}>
                      {u.username}
                      {u.username === me.username && <span className={styles.youBadge}>You</span>}
                    </td>
                    <td>{(() => {
                      if (!u.employeeCode) return <span style={{ color: "#aaa" }}>—</span>;
                      const emp = employees.find(e => e.code === u.employeeCode);
                      return emp ? emp.name : u.employeeCode;
                    })()}</td>
                    <td>
                      <span className={`${styles.roleBadge} ${roleBadgeClass(u.role)}`}>{u.role}</span>
                    </td>
                    <td className={styles.storeCell}>
                      {!roleNeedsStores(u.role) || !u.allowedStores || u.allowedStores.trim() === ""
                        ? <span className={styles.allStores}>All</span>
                        : u.allowedStores.split(",").map(sid => (
                            <span key={sid} className={styles.storeTag}>{storeLabel(sid)}</span>
                          ))
                      }
                    </td>
                    <td className={styles.actions}>
                      <button className={styles.editBtn} onClick={() => openEditUser(u)}>✎ Edit</button>
                      <button className={styles.deleteBtn}
                        onClick={() => handleDeleteUser(u)}
                        disabled={u.username === me.username}>
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══ ROLES TAB ══════════════════════════════════════════════ */}
      {tab === "roles" && (
        <>
          <div className={styles.sectionHeader}><span>Built-in Roles</span></div>
          <div className={styles.builtinCard}>
            {BUILTIN_ROLE_DESCS.map(r => (
              <div key={r.name} className={styles.builtinRow}>
                <span className={`${styles.roleBadge} ${r.badge}`}>{r.name}</span>
                <span className={styles.builtinDesc}>{r.desc}</span>
              </div>
            ))}
          </div>

          <div className={styles.sectionHeader} style={{ marginTop: 20 }}>
            <span>Custom Roles ({roles.length})</span>
            <button className={styles.addBtn} onClick={openAddRole}>+ Add Role</button>
          </div>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Add Sales</th><th>Edit Sales</th><th>Del Sales</th>
                  <th>Add Inv.</th><th>Edit Inv.</th><th>Del Inv.</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: "center", color: "#aaa", padding: "24px" }}>No custom roles yet.</td></tr>
                )}
                {roles.map(r => (
                  <tr key={r.id}>
                    <td><span className={`${styles.roleBadge} ${styles.badgeCustom}`}>{r.name}</span></td>
                    <td className={styles.permCell}>{r.canAddSales        ? "✓" : "—"}</td>
                    <td className={styles.permCell}>{r.canEditSales       ? "✓" : "—"}</td>
                    <td className={styles.permCell}>{r.canDeleteSales     ? "✓" : "—"}</td>
                    <td className={styles.permCell}>{r.canAddInventory    ? "✓" : "—"}</td>
                    <td className={styles.permCell}>{r.canEditInventory   ? "✓" : "—"}</td>
                    <td className={styles.permCell}>{r.canDeleteInventory ? "✓" : "—"}</td>
                    <td className={styles.actions}>
                      <button className={styles.editBtn} onClick={() => openEditRole(r)}>✎ Edit</button>
                      <button className={styles.deleteBtn} onClick={() => handleDeleteRole(r)}>🗑 Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══ STORES TAB ═════════════════════════════════════════════ */}
      {tab === "stores" && (
        <>
          <div className={styles.sectionHeader}>
            <span>Stores ({stores.length})</span>
          </div>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>ID</th>
                  <th>Store Name</th>
                  <th style={{ width: 220 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stores.map(s => (
                  <tr key={s.id}>
                    <td><span className={styles.storeCheckId}>{s.id}</span></td>
                    <td>
                      <input
                        className={styles.input}
                        value={storeDrafts[s.id] || ""}
                        onChange={e => setStoreDrafts(d => ({ ...d, [s.id]: e.target.value }))}
                        placeholder={`MR Styles Store ${s.id}`}
                      />
                    </td>
                    <td className={styles.actions}>
                      <button className={styles.editBtn} onClick={() => handleSaveStore(s.id)}>
                        {storeSavedId === s.id ? "✓ Saved" : "Save"}
                      </button>
                      <button className={styles.deleteBtn} onClick={() => handleResetStore(s.id)}>
                        Reset
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={styles.hint} style={{ padding: "12px 16px", margin: 0 }}>
              Renaming a store updates the header dropdown, the Add Employee form, and any other store reference. Refresh other open tabs to see the change.
            </p>
          </div>
        </>
      )}

      {/* ══ MAINTENANCE TAB ════════════════════════════════════════ */}
      {tab === "maintenance" && (
        <>
          <div className={styles.sectionHeader}>
            <span>Cloudinary Image Cleanup</span>
          </div>
          <div className={styles.tableCard} style={{ padding: 20 }}>
            <p style={{ margin: "0 0 12px", color: "#555", fontSize: 13, lineHeight: 1.5 }}>
              Scans the Cloudinary <code>inventory/</code> folder, groups images
              by their original filename, and deletes the older duplicates in
              each group — keeping the most recently uploaded one.
              Images currently in use by an inventory item are always preserved.
            </p>
            <p style={{ margin: "0 0 16px", color: "#92400e", fontSize: 12 }}>
              ⚠ This cannot be undone. Run it once after enabling the new
              upload behaviour to reclaim space taken by old random-named
              uploads.
            </p>
            <button
              className={styles.addBtn}
              onClick={handleCleanupCloudinary}
              disabled={cleanupRunning}
            >
              {cleanupRunning ? "Scanning..." : "🧹 Clean up duplicate images"}
            </button>

            {cleanupError && (
              <div className={styles.error} style={{ marginTop: 14 }}>{cleanupError}</div>
            )}

            {cleanupResult && (
              <div style={{ marginTop: 18, padding: 14, background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Cleanup complete</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, fontSize: 13 }}>
                  <div><div style={{ color: "#666" }}>Scanned</div><div style={{ fontWeight: 600, fontSize: 18 }}>{cleanupResult.scanned ?? 0}</div></div>
                  <div><div style={{ color: "#666" }}>Groups</div><div style={{ fontWeight: 600, fontSize: 18 }}>{cleanupResult.groups ?? 0}</div></div>
                  <div><div style={{ color: "#166534" }}>Kept</div><div style={{ fontWeight: 600, fontSize: 18, color: "#166534" }}>{cleanupResult.kept ?? 0}</div></div>
                  <div><div style={{ color: "#991b1b" }}>Deleted</div><div style={{ fontWeight: 600, fontSize: 18, color: "#991b1b" }}>{cleanupResult.deleted ?? 0}</div></div>
                </div>
                {Array.isArray(cleanupResult.removedPublicIds) && cleanupResult.removedPublicIds.length > 0 && (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: "pointer", fontSize: 12, color: "#555" }}>
                      Show removed public_ids ({cleanupResult.removedPublicIds.length})
                    </summary>
                    <ul style={{ marginTop: 8, fontSize: 11, fontFamily: "monospace", color: "#666", maxHeight: 200, overflowY: "auto", paddingLeft: 18 }}>
                      {cleanupResult.removedPublicIds.map(id => <li key={id}>{id}</li>)}
                    </ul>
                  </details>
                )}
                {Array.isArray(cleanupResult.errors) && cleanupResult.errors.length > 0 && (
                  <details style={{ marginTop: 8 }} open>
                    <summary style={{ cursor: "pointer", fontSize: 12, color: "#991b1b" }}>
                      ⚠ {cleanupResult.errors.length} error(s)
                    </summary>
                    <ul style={{ marginTop: 8, fontSize: 11, color: "#991b1b", paddingLeft: 18 }}>
                      {cleanupResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══ USER MODAL ═════════════════════════════════════════════ */}
      {showUserModal && (
        <div className={styles.overlay} onClick={closeUserModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{editUser ? "Edit User" : "Add New User"}</h2>
            <form onSubmit={handleSaveUser} className={styles.form}>

              <div className={styles.field}>
                <label>Username <span className={styles.req}>*</span></label>
                <input className={styles.input} required value={userForm.username}
                  onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} />
              </div>

              <div className={styles.field}>
                <label>Email</label>
                <input className={styles.input} type="email" value={userForm.email}
                  onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} />
              </div>

              <div className={styles.field}>
                <label>Password {editUser && <span className={styles.hint}>(leave blank to keep current)</span>}</label>
                <input className={styles.input} type="password"
                  required={!editUser} value={userForm.password}
                  onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} />
              </div>

              <div className={styles.field}>
                <label>Role <span className={styles.req}>*</span></label>
                <select className={styles.input} value={userForm.role}
                  onChange={e => setUserForm(f => ({ ...f, role: e.target.value, allowedStores: "", employeeCode: e.target.value === "Admin" ? "" : f.employeeCode }))}>
                  {availableRoles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Employee link — required for non-Admin roles */}
              {roleNeedsStores(userForm.role) && (
                <div className={styles.field}>
                  <label>Linked Employee <span className={styles.req}>*</span></label>
                  <select className={styles.input} value={userForm.employeeCode}
                    onChange={e => setUserForm(f => ({ ...f, employeeCode: e.target.value }))}>
                    <option value="">— Select Employee —</option>
                    {employees
                      .filter(emp => emp.status !== "Inactive")
                      .map(emp => {
                        const taken = users.some(u =>
                          u.employeeCode === emp.code && (!editUser || u.id !== editUser.id)
                        );
                        return (
                          <option key={emp.code} value={emp.code} disabled={taken}>
                            {emp.name}{emp.role ? ` — ${emp.role}` : ""}{taken ? " (already linked)" : ""}
                          </option>
                        );
                      })}
                  </select>
                  {employees.length === 0 && (
                    <div className={styles.hint} style={{ marginTop: 4, color: "#c0392b" }}>
                      No employees found. Please add employees in the People page first.
                    </div>
                  )}
                </div>
              )}

              {/* Store checkboxes — only for non-Admin roles */}
              {roleNeedsStores(userForm.role) && (
                <div className={styles.field}>
                  <label>Store Access <span className={styles.hint}>(leave all unchecked = all stores)</span></label>
                  <div className={styles.storeCheckList}>
                    {stores.map(s => {
                      const checked = parseAllowed(userForm.allowedStores).includes(String(s.id));
                      return (
                        <label key={s.id} className={styles.storeCheckItem}>
                          <input type="checkbox" checked={checked}
                            onChange={() => setUserForm(f => ({ ...f, allowedStores: toggleStore(s.id, f.allowedStores) }))} />
                          <span className={styles.storeCheckId}>{s.id}</span>
                          {s.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {userError && <div className={styles.error}>{userError}</div>}
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={closeUserModal}>Cancel</button>
                <button type="submit" className={styles.saveBtn} disabled={userSaving}>
                  {userSaving ? "Saving..." : editUser ? "Save Changes" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ ROLE MODAL ═════════════════════════════════════════════ */}
      {showRoleModal && (
        <div className={styles.overlay} onClick={closeRoleModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{editRole ? "Edit Role" : "Add New Role"}</h2>
            <form onSubmit={handleSaveRole} className={styles.form}>
              <div className={styles.field}>
                <label>Role Name <span className={styles.req}>*</span></label>
                <input className={styles.input} required value={roleForm.name}
                  onChange={e => setRoleForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Cashier, Encoder, Viewer" />
              </div>
              <div className={styles.field}>
                <label>Permissions</label>
                <div className={styles.permGroup}>
                  <div className={styles.permGroupTitle}>Sales</div>
                  {PERM_FIELDS.filter(p => p.key.includes("Sales")).map(p => (
                    <label key={p.key} className={styles.permCheckItem}>
                      <input type="checkbox" checked={roleForm[p.key]}
                        onChange={e => setRoleForm(f => ({ ...f, [p.key]: e.target.checked }))} />
                      {p.label}
                    </label>
                  ))}
                  <div className={styles.permGroupTitle} style={{ marginTop: 12 }}>Inventory</div>
                  {PERM_FIELDS.filter(p => p.key.includes("Inventory")).map(p => (
                    <label key={p.key} className={styles.permCheckItem}>
                      <input type="checkbox" checked={roleForm[p.key]}
                        onChange={e => setRoleForm(f => ({ ...f, [p.key]: e.target.checked }))} />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
              {roleError && <div className={styles.error}>{roleError}</div>}
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={closeRoleModal}>Cancel</button>
                <button type="submit" className={styles.saveBtn} disabled={roleSaving}>
                  {roleSaving ? "Saving..." : editRole ? "Save Changes" : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
