import React, { useEffect, useState, useMemo } from "react";
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

export default function PeoplePage() {
  const [allEmployees, setAllEmployees]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [dept, setDept]                   = useState("All Departments");
  const [deptOpen, setDeptOpen]           = useState(false);
  const [page, setPage]                   = useState(0);
  const [sortCol, setSortCol]             = useState(null);
  const [sortDir, setSortDir]             = useState("asc");

  useEffect(() => {
    fetch(`${API_BASE}/api/employees`)
      .then(r => r.json())
      .then(data => { setAllEmployees(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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
    if (dept !== "All Departments") {
      list = list.filter(e => e.department === dept);
    }
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

  const sortArrow = col =>
    sortCol === col ? (sortDir === "asc" ? " ▴" : " ▾") : " ▾";

  const pagerNums = Array.from({ length: totalPages }, (_, i) => i);

  return (
    <div className={styles.page}>
      {/* ── Page title ── */}
      <div className={styles.pageTitle}>People</div>

      {/* ── Main card ── */}
      <div className={styles.card}>

        {/* Top bar */}
        <div className={styles.topBar}>
          <div className={styles.searchWrap}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="9" r="6"/><path d="M15 15l-3.5-3.5"/>
            </svg>
            <input
              className={styles.searchInput}
              placeholder="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.deptWrap}>
            <button className={styles.deptBtn} onClick={() => setDeptOpen(o => !o)}>
              {dept} <span className={styles.chevron}>▾</span>
            </button>
            {deptOpen && (
              <div className={styles.deptDrop}>
                {departments.map(d => (
                  <div
                    key={d}
                    className={`${styles.deptItem} ${d === dept ? styles.deptItemActive : ""}`}
                    onClick={() => { setDept(d); setDeptOpen(false); }}>
                    {d}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className={styles.addIconBtn} title="Add Employee">＋</button>
        </div>

        {/* Card header row */}
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>People</span>
          <button className={styles.addBtn}>＋ Add Employee</button>
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
                <th className={`${styles.th} ${styles.sortable}`} onClick={() => toggleSort("role")}>
                  Role{sortArrow("role")}
                </th>
                <th className={`${styles.th} ${styles.sortable}`} onClick={() => toggleSort("department")}>
                  Department{sortArrow("department")}
                </th>
                <th className={`${styles.th} ${styles.sortable}`} onClick={() => toggleSort("status")}>
                  Status{sortArrow("status")}
                </th>
                <th className={`${styles.th} ${styles.sortable}`} onClick={() => toggleSort("salary")}>
                  Salary{sortArrow("salary")}
                </th>
                <th className={styles.th} />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className={styles.emptyCell}>Loading…</td></tr>
              )}
              {!loading && pageRows.length === 0 && (
                <tr><td colSpan={7} className={styles.emptyCell}>No employees found.</td></tr>
              )}
              {pageRows.map((emp, i) => (
                <tr key={emp.code || i} className={styles.tr}>
                  <td className={styles.tdCheck}><span className={styles.checkBox} /></td>
                  <td className={styles.tdEmp}>
                    <div
                      className={styles.avatar}
                      style={{ background: avatarColor(emp.name) }}>
                      {initials(emp.name)}
                    </div>
                    <div>
                      <div className={styles.empName}>{emp.name}</div>
                      <div className={styles.empRole}>{emp.role}</div>
                    </div>
                  </td>
                  <td className={styles.td}>{emp.role}</td>
                  <td className={styles.td}>{emp.department}</td>
                  <td className={styles.td}>
                    <StatusBadge status={emp.status} />
                  </td>
                  <td className={styles.td}>
                    {emp.salary != null ? `$${Number(emp.salary).toLocaleString()}` : "—"}
                  </td>
                  <td className={styles.tdEdit}>
                    <button className={styles.editBtn} title="Edit">✎</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={styles.pager}>
          <button
            className={styles.pagerArrow}
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}>
            ‹
          </button>
          <div className={styles.pagerNums}>
            {pagerNums.map(n => (
              <button
                key={n}
                className={`${styles.pagerNum} ${n === page ? styles.pagerNumActive : ""}`}
                onClick={() => setPage(n)}>
                {n + 1}
              </button>
            ))}
          </div>
          <button
            className={styles.pagerArrow}
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}>
            ›
          </button>
        </div>
      </div>
    </div>
  );
}