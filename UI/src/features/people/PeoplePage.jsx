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

const DOC_TYPES = [
  { key: "contract", label: "Contract", tag: "P", type: "pdf", color: "#2b6cb0" },
  { key: "resume",   label: "Resume",   tag: "P", type: "pdf",  color: "#c0392b" },
  { key: "cv",       label: "CV",       tag: "P", type: "pdf",  color: "#6c3483" },
];

function EmployeeModal({ emp, onClose, onSaved }) {
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile]       = useState(null);
  const [docFiles, setDocFiles]         = useState({}); // { contract: File, resume: File, cv: File }
  const [existingDocs, setExistingDocs] = useState([]);
  const isEdit     = !!emp;
  const overlayRef = useRef(null);
  const photoRef   = useRef(null);

  useEffect(() => {
    if (!emp) { setForm(EMPTY_FORM); setPhotoPreview(null); setPhotoFile(null); setDocFiles({}); setExistingDocs([]); return; }
    const base = {
      name:        emp.name        || "",
      role:        emp.role        || "",
      department:  emp.department  || "",
      salary:      emp.salary != null ? String(emp.salary) : "",
      status:      emp.status      || "Active",
      birthday: "", phone: "", email: "", citizenship: "", city: "", address: "",
    };
    setForm(base);
    setPhotoPreview(emp.photoUrl || null);
    setPhotoFile(null);
    setDocFiles({});

    // Fetch profile + documents
    Promise.all([
      fetch(`${API_BASE}/api/employees/${emp.code}/profile`).then(r => r.ok ? r.json() : {}),
      fetch(`${API_BASE}/api/employees/${emp.code}/documents`).then(r => r.ok ? r.json() : []),
    ]).then(([p, docs]) => {
      setForm(f => ({
        ...f,
        birthday:    p.birthday    || "",
        phone:       p.phone       || "",
        email:       p.email       || "",
        citizenship: p.citizenship || "",
        city:        p.city        || "",
        address:     p.address     || "",
      }));
      setExistingDocs(Array.isArray(docs) ? docs : []);
    }).catch(() => {});
  }, [emp]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function onPhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function onDocChange(key, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFiles(d => ({ ...d, [key]: file }));
  }

  function removeDoc(key) { setDocFiles(d => { const n = { ...d }; delete n[key]; return n; }); }

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

      // Upload photo if changed
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        await fetch(`${API_BASE}/api/employees/${code}/photo`, { method: "POST", body: fd });
      }

      // Upload new documents
      for (const dt of DOC_TYPES) {
        const file = docFiles[dt.key];
        if (!file) continue;
        const fd = new FormData();
        fd.append("file", file);
        fd.append("name", dt.label);
        fd.append("type", dt.type);
        fd.append("tag",  dt.tag);
        await fetch(`${API_BASE}/api/employees/${code}/documents`, { method: "POST", body: fd });
      }

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
          {/* Photo upload */}
          <div className={styles.photoWrap} onClick={() => photoRef.current?.click()} title="Click to change photo">
            {photoPreview
              ? <img src={photoPreview} alt="photo" className={styles.photoImg} />
              : <div className={styles.modalAvatar} style={{ background: avatarColor(form.name || "?") }}>{initials(form.name || "?")}</div>
            }
            <div className={styles.photoOverlay}>📷</div>
            <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onPhotoChange} />
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
              <input className={styles.input} type="date" value={form.birthday} onChange={e => set("birthday", e.target.value)} />
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

          {/* Documents */}
          <div className={styles.modalSection}>Documents</div>
          <div className={styles.docsGrid}>
            {DOC_TYPES.map(dt => {
              const existing = existingDocs.find(d => d.name === dt.label);
              const staged   = docFiles[dt.key];
              // Use backend proxy so download works regardless of Cloudinary access settings
              const docUrl   = existing?.id
                ? `${API_BASE}/api/employees/${emp.code}/documents/${existing.id}/download`
                : null;
              return (
                <div key={dt.key} className={styles.docCard}>
                  <div className={styles.docCardIcon} style={{ background: dt.color }}>{dt.tag}</div>
                  <div className={styles.docCardInfo}>
                    <div className={styles.docCardLabel}>{dt.label}</div>
                    {staged
                      ? <div className={styles.docCardFile}>{staged.name} <button className={styles.docRemove} onClick={() => removeDoc(dt.key)}>✕</button></div>
                      : docUrl
                        ? <div className={styles.docCardFile}>
                            <span>{existing.size}</span>
                            <a href={docUrl} download className={styles.docLink}>⬇ Download</a>
                          </div>
                        : <div className={styles.docCardEmpty}>No file uploaded</div>
                    }
                  </div>
                  <label className={styles.docUploadBtn} title={`Upload ${dt.label}`}>
                    ↑
                    <input type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={e => onDocChange(dt.key, e)} />
                  </label>
                </div>
              );
            })}
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
                    {emp.photoUrl
                      ? <img src={emp.photoUrl} alt={emp.name} className={styles.avatarImg} />
                      : <div className={styles.avatar} style={{ background: avatarColor(emp.name) }}>{initials(emp.name)}</div>
                    }
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
              {/* Ghost rows to keep table height fixed at PAGE_SIZE rows */}
              {Array.from({ length: PAGE_SIZE - pageRows.length }).map((_, i) => (
                <tr key={`ghost-${i}`} className={styles.trGhost}>
                  <td colSpan={7} />
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