import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./SettingsPage.module.css";
import API from "../../config";

const BUILTIN_ROLES = new Set(["Admin", "user", "userS", "userI", "userSI"]);

const BUILTIN_ROLE_DESCS = [
  { name: "Admin",  desc: "Full access (add, edit, delete) — all stores, manages users & roles", badge: styles.badgeAdmin },
  { name: "user",   desc: "View only — no add, edit, or delete",                                 badge: styles.badgeUser },
  { name: "userS",  desc: "Sales only — add & edit (no delete)",                                 badge: styles.badgeUserS },
  { name: "userI",  desc: "Inventory only — add & edit (no delete)",                             badge: styles.badgeUserI },
  { name: "userSI", desc: "Sales + Inventory — add & edit (no delete)",                          badge: styles.badgeUserSI },
];

// Fixed 5 stores — always shown in user modal
const STORES = [
  { id: 1, name: "MR STYLES STORE 1" },
  { id: 2, name: "MR STYLES STORE 2" },
  { id: 3, name: "MR STYLES STORE 3" },
  { id: 4, name: "MR STYLES STORE 4" },
  { id: 5, name: "MR STYLES STORE 5" },
];

const EMPTY_USER = { username: "", email: "", password: "", role: "user", allowedStores: "" };
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

  const [roles,         setRoles]         = useState([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editRole,      setEditRole]      = useState(null);
  const [roleForm,      setRoleForm]      = useState(EMPTY_ROLE);
  const [roleSaving,    setRoleSaving]    = useState(false);
  const [roleError,     setRoleError]     = useState("");

  useEffect(() => {
    fetchUsers();
    fetchRoles();
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
    const store = STORES.find(s => String(s.id) === sid.trim());
    return store ? store.name : `Store ${sid}`;
  };

  // ── User CRUD ─────────────────────────────────────────────────────
  const openAddUser  = () => { setUserForm(EMPTY_USER); setEditUser(null); setUserError(""); setShowUserModal(true); };
  const openEditUser = (u) => {
    setUserForm({ username: u.username, email: u.email || "", password: "", role: u.role, allowedStores: u.allowedStores || "" });
    setEditUser(u); setUserError(""); setShowUserModal(true);
  };
  const closeUserModal = () => { setShowUserModal(false); setEditUser(null); setUserForm(EMPTY_USER); setUserError(""); };

  const handleSaveUser = (e) => {
    e.preventDefault();
    if (!editUser && userForm.username.toLowerCase() === "admin") {
      setUserError("Username 'admin' is reserved and cannot be created.");
      return;
    }
    setUserSaving(true); setUserError("");
    const url    = editUser ? `${API}/api/users/${editUser.id}` : `${API}/api/users`;
    const method = editUser ? "PUT" : "POST";
    const body   = { ...userForm };
    if (editUser && !body.password) delete body.password;
    if (!roleNeedsStores(body.role)) body.allowedStores = "";

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
                  <th>Email</th>
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
                    <td>{u.email || "—"}</td>
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
                  onChange={e => setUserForm(f => ({ ...f, role: e.target.value, allowedStores: "" }))}>
                  {availableRoles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Store checkboxes — only for non-Admin roles */}
              {roleNeedsStores(userForm.role) && (
                <div className={styles.field}>
                  <label>Store Access <span className={styles.hint}>(leave all unchecked = all stores)</span></label>
                  <div className={styles.storeCheckList}>
                    {STORES.map(s => {
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
