import React, { useState, useEffect, useMemo, useRef } from "react";
import API_BASE from "../../config";
import styles from "./TimesheetPage.module.css";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DOW = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function getUser() {
  try { return JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "null"); }
  catch { return null; }
}

function fmt12(t) {
  if (!t) return "";
  const [h, m] = (typeof t === "string" ? t : "").split(":").map(Number);
  if (isNaN(h)) return "";
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtShort(t) {
  if (!t) return "";
  const [h, m] = (typeof t === "string" ? t : "").split(":").map(Number);
  if (isNaN(h)) return "";
  const ampm = h >= 12 ? "PM" : "AM";
  const mm = m > 0 ? `:${String(m).padStart(2, "0")}` : "";
  return `${h % 12 || 12}${mm}${ampm}`;
}

function buildGrid(year, month) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = (first.getDay() + 6) % 7; // Mon=0

  const cells = [];
  const prevDays = new Date(year, month, 0).getDate();

  for (let i = startDow - 1; i >= 0; i--)
    cells.push({ day: prevDays - i, month: month === 0 ? 11 : month - 1, year: month === 0 ? year - 1 : year, muted: true });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, month, year, muted: false });
  const nm = month === 11 ? 0 : month + 1, ny = month === 11 ? year + 1 : year;
  let n = 1;
  while (cells.length < 42) cells.push({ day: n++, month: nm, year: ny, muted: true });

  return cells;
}

function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ── Friendly time picker (Hour / Minute / AM-PM dropdowns) ──
function TimePicker({ value, onChange, label }) {
  let hr12 = "", min = "", ampm = "AM";
  if (value) {
    const [h, m] = value.split(":").map(Number);
    ampm = h >= 12 ? "PM" : "AM";
    hr12 = String(h % 12 || 12);
    min = String(m).padStart(2, "0");
  }

  function update(newHr, newMin, newAmpm) {
    const h = newHr === "" ? "" : newHr;
    const m = newMin === "" ? "00" : newMin;
    const ap = newAmpm || ampm;
    if (h === "") { onChange(""); return; }
    let h24 = parseInt(h, 10);
    if (ap === "PM" && h24 !== 12) h24 += 12;
    if (ap === "AM" && h24 === 12) h24 = 0;
    onChange(`${String(h24).padStart(2, "0")}:${m}`);
  }

  const hours = ["","1","2","3","4","5","6","7","8","9","10","11","12"];
  const minutes = ["00","05","10","15","20","25","30","35","40","45","50","55"];

  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <div className={styles.timePickerRow}>
        <select className={styles.timeSelect} value={hr12} onChange={e => update(e.target.value, min, ampm)}>
          <option value="">--</option>
          {hours.filter(Boolean).map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className={styles.timeColon}>:</span>
        <select className={styles.timeSelect} value={min} onChange={e => update(hr12, e.target.value, ampm)} disabled={!hr12}>
          {minutes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className={styles.timeAmpm} value={ampm} onChange={e => update(hr12, min, e.target.value)} disabled={!hr12}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

function statusColor(s) {
  if (!s) return "rgba(0,0,0,.15)";
  const l = s.toLowerCase();
  if (l === "present") return "#27ae60";
  if (l === "absent") return "#7f8c8d";
  if (l === "leave") return "#c0392b";
  if (l === "holiday") return "#e74c3c";
  return "#95a5a6";
}

function statusBg(s) {
  if (!s) return "transparent";
  const l = s.toLowerCase();
  if (l === "present") return "rgba(39,174,96,.12)";
  if (l === "absent") return "rgba(127,140,141,.15)";
  if (l === "leave") return "rgba(192,57,43,.12)";
  if (l === "holiday") return "rgba(231,76,60,.12)";
  return "transparent";
}

// ── Add/Edit Timesheet Modal ──
function TimesheetModal({ entry, employeeCode, onClose, onSaved }) {
  const isEdit = !!entry;
  const [form, setForm] = useState({
    date: "", endDate: "", schedStart: "08:00", schedEnd: "17:00",
    timeIn: "", timeOut: "", breakMinutes: 60,
    workedHours: 0, lateMinutes: 0, undertimeMinutes: 0,
    overtimeHours: 0, status: "Present", remarks: "",
  });
  const [useRange, setUseRange] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const overlayRef = useRef(null);

  useEffect(() => {
    if (entry) {
      setForm({
        date: entry.date || "",
        endDate: "",
        schedStart: entry.schedStart || "08:00",
        schedEnd: entry.schedEnd || "17:00",
        timeIn: entry.timeIn || "",
        timeOut: entry.timeOut || "",
        breakMinutes: entry.breakMinutes ?? 60,
        workedHours: entry.workedHours ?? 0,
        lateMinutes: entry.lateMinutes ?? 0,
        undertimeMinutes: entry.undertimeMinutes ?? 0,
        overtimeHours: entry.overtimeHours ?? 0,
        status: entry.status || "Present",
        remarks: entry.remarks || "",
      });
      setUseRange(false);
    }
  }, [entry]);

  function set(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v };
      // Auto-compute whenever time fields change
      return recompute(next);
    });
  }

  function toMin(t) {
    if (!t) return null;
    const [h, m] = t.split(":").map(Number);
    return isNaN(h) ? null : h * 60 + (m || 0);
  }

  function recompute(f) {
    const schedIn = toMin(f.schedStart);
    const schedOut = toMin(f.schedEnd);
    const tin = toMin(f.timeIn);
    const tout = toMin(f.timeOut);
    const brk = Number(f.breakMinutes) || 0;

    // Late = how many minutes after scheduled start
    let late = 0;
    if (schedIn !== null && tin !== null && tin > schedIn) late = tin - schedIn;
    f.lateMinutes = late;

    // Worked hours & overtime & undertime
    if (tin !== null && tout !== null && tout > tin) {
      const totalMin = tout - tin - brk;
      const worked = Math.max(0, totalMin / 60);
      const schedHours = (schedIn !== null && schedOut !== null) ? (schedOut - schedIn - brk) / 60 : 8;
      f.workedHours = Math.round(worked * 10) / 10;
      f.overtimeHours = worked > schedHours ? Math.round((worked - schedHours) * 10) / 10 : 0;
      f.undertimeMinutes = worked < schedHours ? Math.round((schedHours - worked) * 60) : 0;
    } else {
      f.workedHours = 0;
      f.overtimeHours = 0;
      f.undertimeMinutes = 0;
    }
    return f;
  }

  async function save() {
    if (!form.date) { setError("Start date is required."); return; }
    if (useRange && !isEdit && !form.endDate) { setError("End date is required for range."); return; }

    setSaving(true); setError(""); setProgress("");
    try {
      if (useRange && !isEdit) {
        // Bulk create: one entry per weekday in range
        const start = new Date(form.date + "T00:00:00");
        const end = new Date(form.endDate + "T00:00:00");
        if (end < start) { setError("End date must be after start date."); setSaving(false); return; }

        const dates = [];
        const cur = new Date(start);
        while (cur <= end) {
          const dow = cur.getDay();
          if (dow !== 0) { // skip Sundays
            dates.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`);
          }
          cur.setDate(cur.getDate() + 1);
        }

        for (let i = 0; i < dates.length; i++) {
          setProgress(`Creating ${i + 1} of ${dates.length}...`);
          const body = {
            employeeCode,
            date: dates[i],
            schedStart: form.schedStart || null,
            schedEnd: form.schedEnd || null,
            timeIn: form.timeIn || null,
            timeOut: form.timeOut || null,
            breakMinutes: Number(form.breakMinutes) || 0,
            workedHours: Number(form.workedHours) || 0,
            lateMinutes: Number(form.lateMinutes) || 0,
            undertimeMinutes: Number(form.undertimeMinutes) || 0,
            overtimeHours: Number(form.overtimeHours) || 0,
            status: form.status,
            remarks: form.remarks.trim() || null,
          };
          await fetch(`${API_BASE}/api/timesheets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }
      } else {
        // Single entry
        const body = {
          employeeCode,
          date: form.date,
          schedStart: form.schedStart || null,
          schedEnd: form.schedEnd || null,
          timeIn: form.timeIn || null,
          timeOut: form.timeOut || null,
          breakMinutes: Number(form.breakMinutes) || 0,
          workedHours: Number(form.workedHours) || 0,
          lateMinutes: Number(form.lateMinutes) || 0,
          undertimeMinutes: Number(form.undertimeMinutes) || 0,
          overtimeHours: Number(form.overtimeHours) || 0,
          status: form.status,
          remarks: form.remarks.trim() || null,
        };
        const url = isEdit ? `${API_BASE}/api/timesheets/${entry.id}` : `${API_BASE}/api/timesheets`;
        await fetch(url, {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      onSaved();
    } catch {
      setError("Failed to save.");
    } finally {
      setSaving(false);
      setProgress("");
    }
  }

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>{isEdit ? "Edit Timesheet" : "+ Add Timesheet"}</div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          {/* Range toggle — only for new entries */}
          {!isEdit && (
            <label className={styles.rangeToggle} onClick={() => setUseRange(r => !r)}>
              <div className={`${styles.toggleTrack} ${useRange ? styles.toggleOn : ""}`}>
                <div className={styles.toggleThumb} />
              </div>
              <span className={styles.toggleText}>Date Range {useRange ? "(bulk create)" : ""}</span>
            </label>
          )}

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{useRange && !isEdit ? "Start Date *" : "Date *"}</label>
              <input className={styles.input} type="date" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            {useRange && !isEdit ? (
              <div className={styles.field}>
                <label className={styles.label}>End Date *</label>
                <input className={styles.input} type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} />
              </div>
            ) : (
              <div className={styles.field}>
                <label className={styles.label}>Status</label>
                <select className={styles.input} value={form.status} onChange={e => set("status", e.target.value)}>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                  <option value="Holiday">Holiday</option>
                </select>
              </div>
            )}
          </div>

          {useRange && !isEdit && (
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Status</label>
                <select className={styles.input} value={form.status} onChange={e => set("status", e.target.value)}>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                  <option value="Holiday">Holiday</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>&nbsp;</label>
                <div className={styles.rangeHint}>Sundays are automatically skipped</div>
              </div>
            </div>
          )}

          <div className={styles.fieldRow}>
            <TimePicker label="Scheduled Start" value={form.schedStart} onChange={v => set("schedStart", v)} />
            <TimePicker label="Scheduled End" value={form.schedEnd} onChange={v => set("schedEnd", v)} />
          </div>

          <div className={styles.fieldRow}>
            <TimePicker label="Time In" value={form.timeIn} onChange={v => set("timeIn", v)} />
            <TimePicker label="Time Out" value={form.timeOut} onChange={v => set("timeOut", v)} />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Break (mins)</label>
              <input className={styles.input} type="number" value={form.breakMinutes} onChange={e => set("breakMinutes", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Worked Hours</label>
              <input className={`${styles.input} ${styles.inputReadonly}`} type="text" value={form.workedHours} readOnly />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Late (mins)</label>
              <input className={`${styles.input} ${styles.inputReadonly}`} type="text" value={form.lateMinutes} readOnly />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Undertime (mins)</label>
              <input className={`${styles.input} ${styles.inputReadonly}`} type="text" value={form.undertimeMinutes} readOnly />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Overtime (hrs)</label>
              <input className={`${styles.input} ${styles.inputReadonly}`} type="text" value={form.overtimeHours} readOnly />
            </div>
            <div className={styles.field} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Remarks</label>
            <textarea className={styles.textarea} value={form.remarks} onChange={e => set("remarks", e.target.value)} placeholder="Traffic delay, etc." />
          </div>
        </div>

        {error && <div className={styles.modalError}>{error}</div>}
        {progress && <div className={styles.modalProgress}>{progress}</div>}
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
          <button className={styles.saveBtn} onClick={save} disabled={saving}>
            {saving ? (progress || "Saving...") : isEdit ? "Save Changes" : useRange ? "Create All" : "+ Add Timesheet"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
export default function TimesheetPage() {
  const user = getUser();
  const isAdmin = user?.role === "Admin";
  const today = new Date();

  const [employees, setEmployees] = useState([]);
  const [selectedCode, setSelectedCode] = useState(null);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [modalEntry, setModalEntry] = useState(undefined); // undefined=closed, null=add, obj=edit
  const [monthDropOpen, setMonthDropOpen] = useState(false);
  const monthDropRef = useRef(null);
  const [empSearch, setEmpSearch] = useState("");

  // Load employees — non-admin uses own employeeCode directly
  useEffect(() => {
    if (!isAdmin && user?.employeeCode) {
      setSelectedCode(user.employeeCode);
      return;
    }
    fetch(`${API_BASE}/api/employees`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setEmployees(list);
        if (list.length > 0 && !selectedCode) setSelectedCode(list[0].code);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load timesheet entries
  useEffect(() => {
    if (!selectedCode) return;
    fetch(`${API_BASE}/api/timesheets?employeeCode=${selectedCode}&year=${year}&month=${month + 1}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]));
  }, [selectedCode, year, month]);

  // Close month dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (monthDropRef.current && !monthDropRef.current.contains(e.target)) setMonthDropOpen(false);
    }
    if (monthDropOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [monthDropOpen]);

  const cells = useMemo(() => buildGrid(year, month), [year, month]);

  // Map entries by date
  const entryMap = useMemo(() => {
    const m = {};
    for (const e of entries) {
      const d = Array.isArray(e.date) ? `${e.date[0]}-${String(e.date[1]).padStart(2,"0")}-${String(e.date[2]).padStart(2,"0")}` : e.date;
      m[d] = e;
    }
    return m;
  }, [entries]);

  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedEmployee = employees.find(e => e.code === selectedCode);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth()); }

  function reload() {
    setModalEntry(undefined);
    setSelectedEntry(null);
    // re-fetch
    if (!selectedCode) return;
    fetch(`${API_BASE}/api/timesheets?employeeCode=${selectedCode}&year=${year}&month=${month + 1}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]));
  }

  async function handleDelete() {
    if (!selectedEntry?.id) return;
    await fetch(`${API_BASE}/api/timesheets/${selectedEntry.id}`, { method: "DELETE" });
    reload();
  }

  const filteredEmps = empSearch
    ? employees.filter(e => (e.name || "").toLowerCase().includes(empSearch.toLowerCase()))
    : employees;

  const todayEntry = entryMap[todayKey];
  const canTimeIn = !todayEntry || !todayEntry.timeIn;
  const canTimeOut = todayEntry && todayEntry.timeIn && !todayEntry.timeOut;

  function nowTime() {
    const n = new Date();
    return `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`;
  }

  async function handleTimeIn() {
    if (!selectedCode) return;
    const now = nowTime();
    const body = {
      employeeCode: selectedCode,
      date: todayKey,
      schedStart: "08:00", schedEnd: "17:00",
      timeIn: now, timeOut: null,
      breakMinutes: 60, workedHours: 0,
      lateMinutes: 0, undertimeMinutes: 0, overtimeHours: 0,
      status: "Present", remarks: null,
    };
    // Compute late
    const [sh] = "08:00".split(":").map(Number);
    const [nh, nm] = now.split(":").map(Number);
    const diffMin = (nh * 60 + nm) - (sh * 60);
    if (diffMin > 0) body.lateMinutes = diffMin;

    await fetch(`${API_BASE}/api/timesheets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    reload();
  }

  async function handleTimeOut() {
    if (!todayEntry?.id) return;
    const now = nowTime();
    const [ih, im] = (todayEntry.timeIn || "08:00").split(":").map(Number);
    const [oh, om] = now.split(":").map(Number);
    const totalMin = (oh * 60 + om) - (ih * 60 + im);
    const breakMin = todayEntry.breakMinutes || 60;
    const worked = Math.max(0, (totalMin - breakMin) / 60);
    const schedHours = 8; // standard
    const ot = Math.max(0, worked - schedHours);

    await fetch(`${API_BASE}/api/timesheets/${todayEntry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timeOut: now,
        workedHours: Math.round(worked * 10) / 10,
        overtimeHours: Math.round(ot * 10) / 10,
        undertimeMinutes: worked < schedHours ? Math.round((schedHours - worked) * 60) : 0,
      }),
    });
    reload();
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Timesheet</h1>
          <div className={styles.clockBtns}>
            <button
              className={`${styles.clockBtn} ${styles.clockIn}`}
              disabled={!canTimeIn}
              onClick={handleTimeIn}
            >
              Time In
            </button>
            <button
              className={`${styles.clockBtn} ${styles.clockOut}`}
              disabled={!canTimeOut}
              onClick={handleTimeOut}
            >
              Time Out
            </button>
          </div>
        </div>
        <button className={styles.addBtn} onClick={() => setModalEntry(null)}>+ Add Timesheet</button>
      </div>

      <div className={`${styles.content} ${isAdmin ? styles.contentWithSidebar : ""}`}>
        {/* ── Sidebar: Employee list ── */}
        {isAdmin && (
          <div className={styles.sidebar}>
            <div className={styles.sideSearch}>
              <input
                className={styles.sideSearchInput}
                placeholder="Search employee..."
                value={empSearch}
                onChange={e => setEmpSearch(e.target.value)}
              />
            </div>
            <div className={styles.sideList}>
              {filteredEmps.map(emp => (
                <div
                  key={emp.code}
                  className={`${styles.sideItem} ${emp.code === selectedCode ? styles.sideItemActive : ""}`}
                  onClick={() => { setSelectedCode(emp.code); setSelectedEntry(null); }}
                >
                  {emp.photoUrl
                    ? <img src={emp.photoUrl} alt={emp.name} className={styles.sideAvatar} />
                    : <div className={styles.sideAvatarFallback}>{(emp.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</div>
                  }
                  <div className={styles.sideInfo}>
                    <div className={styles.sideName}>{emp.name}</div>
                    <div className={styles.sideRole}>{emp.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Calendar ── */}
        <div className={styles.calendarCard}>
          <div className={styles.calToolbar}>
            <button className={styles.navArrow} onClick={prevMonth}>&#8249;</button>
            <div className={styles.monthPickerWrap} ref={monthDropRef}>
              <div className={styles.monthLabel} onClick={() => setMonthDropOpen(o => !o)}>
                {MONTH_NAMES[month]} {year} <span style={{ fontSize: 10, marginLeft: 2 }}>&#9662;</span>
              </div>
              {monthDropOpen && (
                <div className={styles.monthDropdown}>
                  <div className={styles.monthDropYear}>
                    <button className={styles.monthDropArrow} onClick={() => setYear(y => y - 1)}>&#8249;</button>
                    <span className={styles.monthDropYearLabel}>{year}</span>
                    <button className={styles.monthDropArrow} onClick={() => setYear(y => y + 1)}>&#8250;</button>
                  </div>
                  <div className={styles.monthDropGrid}>
                    {MONTH_NAMES.map((m, i) => (
                      <button key={m}
                        className={`${styles.monthDropItem} ${i === month ? styles.monthDropActive : ""}`}
                        onClick={() => { setMonth(i); setMonthDropOpen(false); }}>
                        {m.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button className={styles.navArrow} onClick={nextMonth}>&#8250;</button>
            <button className={styles.todayBtn} onClick={goToday} title="Today">&#9201;</button>
          </div>

          {/* Day-of-week header */}
          <div className={styles.dow}>
            {DOW.map(d => (
              <div key={d} className={`${styles.dowCell} ${d === "Sat" || d === "Sun" ? styles.dowWknd : ""}`}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className={styles.grid}>
            {cells.map((cell, idx) => {
              const key = dateKey(cell.year, cell.month, cell.day);
              const isToday = key === todayKey;
              const entry = entryMap[key];
              const hasEntry = !!entry;

              return (
                <div
                  key={idx}
                  className={`${styles.dayCell} ${cell.muted ? styles.dayMuted : ""} ${isToday ? styles.dayToday : ""} ${hasEntry ? styles.dayHasEntry : ""}`}
                  style={hasEntry && !cell.muted ? { background: statusBg(entry.status) } : undefined}
                  onClick={() => { if (hasEntry && !cell.muted) setSelectedEntry(entry); }}
                >
                  <div className={styles.dayNum}>{cell.day}</div>
                  {hasEntry && !cell.muted && (
                    <div className={styles.dayInfo}>
                      {entry.status === "Present" && entry.timeIn && entry.timeOut ? (
                        <>
                          <div className={styles.dayTime}>
                            <span className={styles.dayDot} style={{ background: "#27ae60" }} />
                            {fmtShort(entry.timeIn)} – {fmtShort(entry.timeOut)}
                          </div>
                          {(entry.overtimeHours > 0 || entry.lateMinutes > 0) && (
                            <div className={styles.dayTags}>
                              {entry.overtimeHours > 0 && (
                                <span className={styles.dayTag} style={{ color: "#2980b9" }}>
                                  <span className={styles.dayDot} style={{ background: "#2980b9" }} />
                                  OT: {entry.overtimeHours}h
                                </span>
                              )}
                              {entry.lateMinutes > 0 && (
                                <span className={styles.dayTag} style={{ color: "#e67e22" }}>
                                  <span className={styles.dayDot} style={{ background: "#e67e22" }} />
                                  Late: {entry.lateMinutes}m
                                </span>
                              )}
                            </div>
                          )}
                          {/* Progress bar */}
                          <div className={styles.dayBar}>
                            <div className={styles.dayBarWorked} style={{ width: `${Math.min(100, ((entry.workedHours || 0) / 9) * 100)}%` }} />
                            {entry.overtimeHours > 0 && (
                              <div className={styles.dayBarOT} style={{ width: `${Math.min(30, (entry.overtimeHours / 3) * 30)}%` }} />
                            )}
                          </div>
                        </>
                      ) : (
                        <div className={styles.dayStatus}>
                          <span className={styles.dayDot} style={{ background: statusColor(entry.status) }} />
                          {entry.status}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right Panel: Details ── */}
        <div className={styles.rightPanel}>
          {selectedEntry ? (
            <div className={styles.detailPanel}>
              <div className={styles.detailHeader}>
                <div className={styles.detailTitle}>Timesheet Details</div>
                <button className={styles.detailClose} onClick={() => setSelectedEntry(null)}>✕</button>
              </div>
              <div className={styles.detailBody}>
                <div className={styles.detailDate}>
                  {(() => {
                    const d = Array.isArray(selectedEntry.date)
                      ? `${selectedEntry.date[0]}-${String(selectedEntry.date[1]).padStart(2,"0")}-${String(selectedEntry.date[2]).padStart(2,"0")}`
                      : selectedEntry.date;
                    const dt = new Date(d + "T00:00:00");
                    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
                    return `${MONTH_NAMES[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
                  })()}
                </div>

                {selectedEntry.schedStart && selectedEntry.schedEnd && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Scheduled</span>
                    <span className={styles.detailValue}>{fmt12(selectedEntry.schedStart)} – {fmt12(selectedEntry.schedEnd)}</span>
                  </div>
                )}
                {selectedEntry.timeIn && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Time In</span>
                    <span className={styles.detailValue}>{fmt12(selectedEntry.timeIn)}</span>
                  </div>
                )}
                {selectedEntry.timeOut && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Time Out</span>
                    <span className={styles.detailValue}>{fmt12(selectedEntry.timeOut)}</span>
                  </div>
                )}
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Break</span>
                  <span className={styles.detailValue}>{selectedEntry.breakMinutes ?? 0} mins</span>
                </div>
                <div className={styles.detailDivider} />
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Worked Hours</span>
                  <span className={styles.detailValue}>{selectedEntry.workedHours ?? 0} hrs</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Late</span>
                  <span className={styles.detailValue}>{selectedEntry.lateMinutes ?? 0} mins</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Undertime</span>
                  <span className={styles.detailValue}>{selectedEntry.undertimeMinutes ?? 0}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Overtime</span>
                  <span className={styles.detailValueHighlight}>+{selectedEntry.overtimeHours ?? 0} hrs</span>
                </div>
                <div className={styles.detailDivider} />
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Status</span>
                  <span className={styles.detailStatusBadge} style={{ background: statusBg(selectedEntry.status), color: statusColor(selectedEntry.status) }}>
                    <span className={styles.detailStatusDot} style={{ background: statusColor(selectedEntry.status) }} />
                    {selectedEntry.status}
                    {selectedEntry.lateMinutes > 0 && selectedEntry.status === "Present" && (
                      <span className={styles.detailLateBadge}>Late</span>
                    )}
                  </span>
                </div>

                {selectedEntry.remarks && (
                  <>
                    <div className={styles.detailDivider} />
                    <div className={styles.detailRemarksLabel}>Remarks</div>
                    <div className={styles.detailRemarks}>{selectedEntry.remarks}</div>
                  </>
                )}

                <div className={styles.detailActions}>
                  <button className={styles.editBtn} onClick={() => setModalEntry(selectedEntry)}>Edit</button>
                  <button className={styles.deleteBtn} onClick={handleDelete}>Delete</button>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.emptyPanel}>
              <div className={styles.emptyIcon}>📋</div>
              <div className={styles.emptyTitle}>No Entry Selected</div>
              <div className={styles.emptyText}>Click on a day in the calendar<br />to see timesheet details.</div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalEntry !== undefined && selectedCode && (
        <TimesheetModal
          entry={modalEntry}
          employeeCode={selectedCode}
          onClose={() => setModalEntry(undefined)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
