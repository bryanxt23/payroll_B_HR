import React, { useEffect, useState, useMemo, useRef } from "react";
import API_BASE from "../../config";
import styles from "./PeoplePage.module.css";

const PAGE_SIZE = 5;
const AVATAR_COLORS = ["#5a4e3a","#3a4e4a","#4a3a5a","#4e4a3a","#3a4a5a","#5a3a3a","#3a5a3a"];

function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function StatusBadge({ status }) {
  if (!status) return <span style={{ color: "rgba(0,0,0,.35)" }}>—</span>;
  const s = status.toLowerCase();
  const cls = s === "active" ? styles.statusActive
            : s === "leave"  ? styles.statusLeave
            : styles.statusInactive;
  return <span className={`${styles.statusBadge} ${cls}`}>{status}</span>;
}

const EMPTY_FORM = {
  name: "", role: "", department: "", salary: "", status: "Active",
  birthday: "", phone: "", email: "", citizenship: "", city: "", address: "",
};

function EmployeeModal({ emp, onClose, onSaved }) {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const isEdit                = !!emp;
  const overlayRef            = useRef(null);

  // Load existing data when editing
  useEffect(() => {
    if (!emp) { setForm(EMPTY_FORM); return; }
    const base = {
      name:        emp.name        || "",
      role:        emp.role        || "",
      department:  emp.department  || "",
      salary:      emp.salary != null ? String(emp.salary) : "",
      status:      emp.status      || "Active",
      birthday: "", phone: "", email: "", citizenship: "", city: "", address: "",
    };
    setForm(base);
    // Fetch profile
    fetch(`${API_BASE}/api/employees/${emp.code}/profile`)
      .then(r => r.ok ? r.json() : {})
      .then(p => setForm(f => ({
        ...f,
        birthday:    p.birthday    || "",
        phone:       p.phone       || "",
        email:       p.email       || "",
        citizenship: p.citizenship || "",
        city:        p.city        || "",
        address:     p.address     || "",
      })))
      .catch(() => {});
  }, [emp]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError("");
    try {
      const code = isEdit
        ? emp.code
        : form.name.trim().toLowerCase().split(/\s+/)[0] + "_" + Date.now();

      const empBody = {
        name:       form.name.trim(),
        role:       form.role.trim(),
        department: form.department.trim(),
        salary:     form.salary !== "" ? Number(form.salary) : null,
        status:     form.status,
      };

      if (isEdit) {
        await fetch(`${API_BASE}/api/employees/${code}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(empBody),
        });
      } else {
        await fetch(`${API_BASE}/api/employees`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...empBody, code, pct: 50 }),
        });
      }

      // Save profile
      const profileBody = {
        birthday:    form.birthday.trim()    || null,
        phone:       form.phone.trim()       || null,
        email:       form.email.trim()       || null,
        citizenship: form.citizenship.trim() || null,
        city:        form.city.trim()        || null,
        address:     form.address.trim()     || null,
      };
      await fetch(`${API_BASE}/api/employees/${code}/profile`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileBody),
      });

      onSaved();
    } catch (e) {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className={styles.modal}>

        {/* Modal header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalAvatar} style={{ background: avatarColor(form.name || "?") }}>
            {initials(form.name || "?")}
          </div>
          <div>
            <div className={styles.modalTitle}>{isEdit ? form.name || "Edit Employee" : "Add Employee"}</div>
            <div className={styles.modalSubtitle}>{isEdit ? emp.code : "New employee"}</div>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {/* Work Information */}
          <div className={styles.modalSection}>Work Information</div>
          <div className={styles.modalGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Full Name *</label>
              <input className={styles.input} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Harry Bender" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Role</label>
              <input className={styles.input} value={form.role} onChange={e => set("role", e.target.value)} placeholder="e.g. Head of Design" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Department</label>
              <input className={styles.input} value={form.department} onChange={e => set("department", e.target.value)} placeholder="e.g. Engineering" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Salary ($)</label>
              <input className={styles.input} type="number" min="0" value={form.salary} onChange={e => set("salary", e.target.value)} placeholder="e.g. 5800" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Status</label>
              <select className={styles.input} value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="Active">Active</option>
                <option value="Leave">Leave</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Personal Information */}
          <div className={styles.modalSection}>Personal Information</div>
          <div className={styles.modalGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Birthday</label>
              <input className={styles.input} value={form.birthday} onChange={e => set("birthday", e.target.value)} placeholder="e.g. 1991-12-11" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Phone Number</label>
              <input className={styles.input} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="e.g. +63 900 000 000" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input className={styles.input} value={form.email} onChange={e => set("email", e.target.value)} placeholder="e.g. harry@company.com" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Citizenship</label>
              <input className={styles.input} value={form.citizenship} onChange={e => set("citizenship", e.target.value)} placeholder="e.g. Singaporean" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>City</label>
              <input className={styles.input} value={form.city} onChange={e => set("city", e.target.value)} placeholder="e.g. Singapore" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Address</label>
              <input className={styles.input} value={form.address} onChange={e => set("address", e.target.value)} placeholder="e.g. Tanjong Pagar" />
            </div>
          </div>
        </div>

        {error && <div className={styles.modalError}>{error}</div>}

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
          <button className={styles.saveBtn} onClick={save} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Employee"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PeoplePage() {
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [dept, setDept]                 = useState("All Departments");
  const [deptOpen, setDeptOpen]         = useState(false);
  const [page, setPage]                 = useState(0);
  const [sortCol, setSortCol]           = useState(null);
  const [sortDir, setSortDir]           = useState("asc");
  const [modalEmp, setModalEmp]         = useState(undefined); // undefined = closed, null = add, obj = edit

  function loadEmployees() {
    setLoading(true);
    fetch(`${API_BASE}/api/employees`)
      .then(r => r.json())
      .then(data => { setAllEmployees(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadEmployees(); }, []);

  const departments = useMemo(() => {
    const set = new Set(allEmployees.map(e => e.department).filter(Boolean));
    return ["All Departments", ...Array.from(set).sort()];
  }, [allEmployees]);

  const filtered = useMemo(() => {
    let list = allEmployees;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        (e.name || "").toLowerCase().includes(q) ||
        (e.role || "").toLowerCase().includes(q) ||
        (e.department || "").toLowerCase().includes(q)
      );
    }
    if (dept !== "All Departments") list = list.filter(e => e.department === dept);
    if (sortCol) {
      list = [...list].sort((a, b) => {
        const av = (a[sortCol] ?? "").toString().toLowerCase();
        const bv = (b[sortCol] ?? "").toString().toLowerCase();
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return list;
  }, [allEmployees, search, dept, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows   = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search, dept]);

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const sortArrow = col => sortCol === col ? (sortDir === "asc" ? " ▴" : " ▾") : " ▾";
  const pagerNums = Array.from({ length: totalPages }, (_, i) => i);

  return (
    <div className={styles.page}>
      <div className={styles.pageTitle}>People</div>

      <div className={styles.card}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <div className={styles.searchWrap}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="9" r="6"/><path d="M15 15l-3.5-3.5"/>
            </svg>
            <input className={styles.searchInput} placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className={styles.deptWrap}>
            <button className={styles.deptBtn} onClick={() => setDeptOpen(o => !o)}>
              {dept} <span className={styles.chevron}>▾</span>
            </button>
            {deptOpen && (
              <div className={styles.deptDrop}>
                {departments.map(d => (
                  <div key={d} className={`${styles.deptItem} ${d === dept ? styles.deptItemActive : ""}`}
                    onClick={() => { setDept(d); setDeptOpen(false); }}>{d}</div>
                ))}
              </div>
            )}
          </div>
          <button className={styles.addIconBtn} title="Add Employee" onClick={() => setModalEmp(null)}>＋</button>
        </div>

        {/* Card header */}
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>People</span>
          <button className={styles.addBtn} onClick={() => setModalEmp(null)}>＋ Add Employee</button>
        </div>

        {/* Filter row */}
        <div className={styles.filterRow}>
          <span className={styles.filterIcon}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="15" height="15">
              <path d="M3 5h14M6 10h8M9 15h2"/>
            </svg>
          </span>
          <span className={styles.filterLabel}>Filter</span>
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thCheck}><span className={styles.checkBox} /></th>
                <th className={styles.th}>Employee</th>
                <th className={`${styles.th} ${styles.sortable}`} onClick={() => toggleSort("role")}>Role{sortArrow("role")}</th>
                <th className={`${styles.th} ${styles.sortable}`} onClick={() => toggleSort("department")}>Department{sortArrow("department")}</th>
                <th className={`${styles.th} ${styles.sortable}`} onClick={() => toggleSort("status")}>Status{sortArrow("status")}</th>
                <th className={`${styles.th} ${styles.sortable}`} onClick={() => toggleSort("salary")}>Salary{sortArrow("salary")}</th>
                <th className={styles.th} />
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className={styles.emptyCell}>Loading…</td></tr>}
              {!loading && pageRows.length === 0 && <tr><td colSpan={7} className={styles.emptyCell}>No employees found.</td></tr>}
              {pageRows.map((emp, i) => (
                <tr key={emp.code || i} className={styles.tr}>
                  <td className={styles.tdCheck}><span className={styles.checkBox} /></td>
                  <td className={styles.tdEmp}>
                    <div className={styles.avatar} style={{ background: avatarColor(emp.name) }}>{initials(emp.name)}</div>
                    <div>
                      <div className={styles.empName}>{emp.name}</div>
                      <div className={styles.empRole}>{emp.role}</div>
                    </div>
                  </td>
                  <td className={styles.td}>{emp.role}</td>
                  <td className={styles.td}>{emp.department || "—"}</td>
                  <td className={styles.td}><StatusBadge status={emp.status} /></td>
                  <td className={styles.td}>{emp.salary != null ? `$${Number(emp.salary).toLocaleString()}` : "—"}</td>
                  <td className={styles.tdEdit}>
                    <button className={styles.editBtn} title="Edit" onClick={() => setModalEmp(emp)}>✎</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={styles.pager}>
          <button className={styles.pagerArrow} disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</button>
          <div className={styles.pagerNums}>
            {pagerNums.map(n => (
              <button key={n} className={`${styles.pagerNum} ${n === page ? styles.pagerNumActive : ""}`} onClick={() => setPage(n)}>{n + 1}</button>
            ))}
          </div>
          <button className={styles.pagerArrow} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      </div>

      {/* Edit / Add Modal */}
      {modalEmp !== undefined && (
        <EmployeeModal
          emp={modalEmp}
          onClose={() => setModalEmp(undefined)}
          onSaved={() => { setModalEmp(undefined); loadEmployees(); }}
        />
      )}
    </div>
  );
}