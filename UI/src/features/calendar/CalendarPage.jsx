import React, { useState, useEffect, useMemo, useRef } from "react";
import API_BASE from "../../config";
import styles from "./CalendarPage.module.css";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DOW = ["Mon","Tue","Wed","Thu","Fri","Sat"];

const EVENT_TYPES = ["Leave","Holiday","Training","Meeting","Store Event","Overtime","Other"];

// Which types default to "affects salary" when selected
const SALARY_DEFAULTS = {
  Leave: true, Holiday: true, Overtime: true,
  Training: false, Meeting: false, "Store Event": false, Other: false,
};

const EVENT_BG = {
  Leave:           "rgba(192,57,43,.25)",
  Holiday:         "rgba(231,76,60,.25)",
  Training:        "rgba(155,89,182,.25)",
  Meeting:         "rgba(86,160,90,.25)",
  "Store Event":   "rgba(230,126,34,.25)",
  Overtime:        "rgba(52,152,219,.25)",
  Birthday:        "rgba(233,130,198,.25)",
  Other:           "rgba(149,165,166,.25)",
};

const EVENT_DOT = {
  Leave:           "#c0392b",
  Holiday:         "#e74c3c",
  Training:        "#9b59b6",
  Meeting:         "#56a05a",
  "Store Event":   "#e67e22",
  Overtime:        "#3498db",
  Birthday:        "#e982c6",
  Other:           "#95a5a6",
};

// -- Friendly time picker (Hour / Minute / AM-PM dropdowns) --
function TimePicker({ value, onChange, label }) {
  // value is "HH:mm" (24h) or ""
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

  const hours = ["", "1","2","3","4","5","6","7","8","9","10","11","12"];
  const minutes = ["00","15","30","45"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 650, color: "rgba(0,0,0,.55)" }}>{label}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <select
          value={hr12}
          onChange={e => update(e.target.value, min, ampm)}
          style={{ flex: 1, padding: "7px 4px", borderRadius: 10, border: "1.5px solid rgba(0,0,0,.10)", background: "rgba(255,255,255,.8)", fontSize: 13, color: "rgba(0,0,0,.75)", cursor: "pointer", outline: "none" }}
        >
          <option value="">--</option>
          {hours.filter(Boolean).map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <select
          value={min}
          onChange={e => update(hr12, e.target.value, ampm)}
          disabled={!hr12}
          style={{ flex: 1, padding: "7px 4px", borderRadius: 10, border: "1.5px solid rgba(0,0,0,.10)", background: "rgba(255,255,255,.8)", fontSize: 13, color: "rgba(0,0,0,.75)", cursor: "pointer", outline: "none" }}
        >
          {minutes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={ampm}
          onChange={e => update(hr12, min, e.target.value)}
          disabled={!hr12}
          style={{ flex: 1, padding: "7px 4px", borderRadius: 10, border: "1.5px solid rgba(0,0,0,.10)", background: "rgba(255,255,255,.8)", fontSize: 13, fontWeight: 700, color: "rgba(0,0,0,.75)", cursor: "pointer", outline: "none" }}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360}, 55%, 50%)`;
}
function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return (parts.map(p => p[0]).join("")).toUpperCase();
}

function formatDate(d) {
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const dt = new Date(d + "T00:00:00");
  return `${days[dt.getDay()]}, ${MONTH_NAMES[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")}${ampm}`;
}

// Build 6-row Mon-Sat grid (skip Sundays)
function buildGrid(year, month) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = (first.getDay() + 6) % 7; // Mon=0...Sun=6

  const cells = [];
  const prevDays = new Date(year, month, 0).getDate();

  // Previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevDays - i;
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    cells.push({ day: d, month: pm, year: py, muted: true });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, muted: false });
  }

  // Next month padding to fill 42 cells
  const nm = month === 11 ? 0 : month + 1;
  const ny = month === 11 ? year + 1 : year;
  let n = 1;
  while (cells.length < 42) {
    cells.push({ day: n++, month: nm, year: ny, muted: true });
  }

  // Filter out Sundays (index 6 in each week row)
  const filtered = [];
  for (let i = 0; i < cells.length; i++) {
    if (i % 7 !== 6) filtered.push(cells[i]);
  }

  return filtered;
}

function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Parse date that might come as "YYYY-MM-DD" string or [year, month, day] array from backend
function parseDate(d) {
  if (!d) return null;
  if (Array.isArray(d)) return `${d[0]}-${String(d[1]).padStart(2, "0")}-${String(d[2]).padStart(2, "0")}`;
  return d;
}

// -- Event Modal --
function EventModal({ event, onClose, onSaved, allEmployees }) {
  const [form, setForm] = useState({
    title: "", startDate: "", endDate: "", startTime: "", endTime: "",
    eventType: "Leave", affectsSalary: true, notes: "", attendees: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [empSearch, setEmpSearch] = useState("");
  const [empOpen, setEmpOpen] = useState(false);
  const overlayRef = useRef(null);
  const dropdownRef = useRef(null);
  const isEdit = !!event;

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setEmpOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (event) {
      const att = event.attendees
        ? event.attendees.split(",").map(s => s.trim()).filter(Boolean)
        : [];
      setForm({
        title: event.title || "",
        startDate: parseDate(event.startDate) || "",
        endDate: parseDate(event.endDate) || "",
        startTime: event.startTime || "",
        endTime: event.endTime || "",
        eventType: event.eventType || "Leave",
        affectsSalary: event.affectsSalary ?? SALARY_DEFAULTS[event.eventType] ?? false,
        notes: event.notes || "",
        attendees: att,
      });
    } else {
      setForm({
        title: "", startDate: "", endDate: "", startTime: "", endTime: "",
        eventType: "Leave", affectsSalary: true, notes: "", attendees: [],
      });
    }
    setError("");
  }, [event]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function addAttendee(code) {
    if (!form.attendees.includes(code)) {
      set("attendees", [...form.attendees, code]);
    }
    setEmpSearch("");
    setEmpOpen(false);
  }

  function removeAttendee(code) {
    set("attendees", form.attendees.filter(c => c !== code));
  }

  async function save() {
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.startDate) { setError("Start date is required."); return; }

    setSaving(true); setError("");
    try {
      const body = {
        title: form.title.trim(),
        startDate: form.startDate,
        endDate: form.endDate || form.startDate,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        eventType: form.eventType,
        affectsSalary: form.affectsSalary,
        notes: form.notes.trim() || null,
        attendees: form.attendees.join(",") || null,
      };

      const url = isEdit
        ? `${API_BASE}/api/calendar/events/${event.id}`
        : `${API_BASE}/api/calendar/events`;

      await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      onSaved();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>{isEdit ? "Edit Event" : "Add Event"}</div>
          <button className={styles.modalClose} onClick={onClose}>?</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.field}>
            <label className={styles.label}>Title *</label>
            <input className={styles.input} value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Quarterly Meeting" />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Event Type</label>
            <select className={styles.select} value={form.eventType} onChange={e => {
              const t = e.target.value;
              const personal = ["Leave", "Holiday", "Overtime"].includes(t);
              setForm(f => ({ ...f, eventType: t, affectsSalary: SALARY_DEFAULTS[t] ?? false, attendees: personal ? [] : f.attendees }));
            }}>
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Start Date *</label>
              <input className={styles.input} type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>End Date</label>
              <input className={styles.input} type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <TimePicker label="Start Time" value={form.startTime} onChange={v => set("startTime", v)} />
            <TimePicker label="End Time" value={form.endTime} onChange={v => set("endTime", v)} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Notes</label>
            <textarea className={styles.textarea} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Add notes..." />
          </div>

          {/* Attendees — hidden for Leave & Overtime (personal events, just the creator) */}
          {!["Leave", "Holiday", "Overtime"].includes(form.eventType) && (
            <div className={styles.field}>
              <label className={styles.label}>Attendees</label>
              <div className={styles.attendeeDropdown} ref={dropdownRef}>
                <div
                  className={styles.attendeeSelectBtn}
                  onClick={() => { setEmpOpen(o => !o); setEmpSearch(""); }}
                >
                  {form.attendees.length === 0
                    ? <span className={styles.attendeePlaceholder}>Select employees...</span>
                    : <span className={styles.attendeeCount}>{form.attendees.length} selected</span>
                  }
                  <span className={styles.attendeeChevron}>{empOpen ? "?" : "?"}</span>
                </div>
                {empOpen && (
                  <div className={styles.attendeeDropdownList}>
                    <div className={styles.attendeeSearchWrap}>
                      <input
                        className={styles.attendeeSearchInput}
                        value={empSearch}
                        onChange={e => setEmpSearch(e.target.value)}
                        placeholder="Search..."
                        autoFocus
                      />
                    </div>
                    <div className={styles.attendeeListScroll}>
                      {allEmployees
                        .filter(e => (e.name || "").toLowerCase().includes(empSearch.toLowerCase()))
                        .map(e => {
                          const checked = form.attendees.includes(e.code);
                          return (
                            <label key={e.code} className={styles.attendeeCheckItem}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => checked ? removeAttendee(e.code) : addAttendee(e.code)}
                              />
                              <span className={styles.attendeeCheckName}>{e.name}</span>
                            </label>
                          );
                        })}
                      {allEmployees.filter(e => (e.name || "").toLowerCase().includes(empSearch.toLowerCase())).length === 0 && (
                        <div className={styles.attendeeNoResult}>No employees found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {form.attendees.length > 0 && (
                <div className={styles.attendeePicker}>
                  {form.attendees.map(code => {
                    const emp = allEmployees.find(e => e.code === code);
                    return (
                      <span key={code} className={styles.attendeeTag}>
                        {emp?.name || code}
                        <button className={styles.attendeeTagRemove} onClick={() => removeAttendee(code)}>?</button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {error && <div className={styles.modalError}>{error}</div>}

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
          <button className={styles.saveBtn} onClick={save} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getUser() {
  try { return JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "null"); }
  catch { return null; }
}

// -- Main CalendarPage --
export default function CalendarPage() {
  const user = getUser();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null); // { date: "YYYY-MM-DD", events: [...] }
  const [attendeeDetails, setAttendeeDetails] = useState([]);
  const [modalEvent, setModalEvent] = useState(undefined); // undefined=closed, null=add, obj=edit
  const [allEmployees, setAllEmployees] = useState([]);
  const [monthDropOpen, setMonthDropOpen] = useState(false);
  const monthDropRef = useRef(null);

  function loadEvents() {
    fetch(`${API_BASE}/api/calendar/events?year=${year}&month=${month + 1}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]));
  }

  useEffect(() => { loadEvents(); }, [year, month]);

  useEffect(() => {
    fetch(`${API_BASE}/api/employees?all=true`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setAllEmployees(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Load attendee details when event selected
  useEffect(() => {
    if (!selectedEvent?.id) { setAttendeeDetails([]); return; }
    fetch(`${API_BASE}/api/calendar/events/${selectedEvent.id}/attendees`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setAttendeeDetails(Array.isArray(data) ? data : []))
      .catch(() => setAttendeeDetails([]));
  }, [selectedEvent]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  // Close month dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (monthDropRef.current && !monthDropRef.current.contains(e.target)) setMonthDropOpen(false);
    }
    if (monthDropOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [monthDropOpen]);

  const cells = useMemo(() => buildGrid(year, month), [year, month]);

  // Map events to grid cell indices + assign consistent slots per row
  const { eventsByIdx, slotsByRow } = useMemo(() => {
    const map = {};
    const filtered = search.trim()
      ? events.filter(e => (e.title || "").toLowerCase().includes(search.toLowerCase()))
      : events;

    // Build lookup: "YYYY-MM-DD" -> grid cell index
    // Use only the FIRST occurrence of each dateKey (prev-month padding may share dates)
    const dateToIdx = {};
    cells.forEach((c, i) => {
      const k = dateKey(c.year, c.month, c.day);
      if (!(k in dateToIdx)) dateToIdx[k] = i;
    });

    for (const ev of filtered) {
      const sd = parseDate(ev.startDate);
      const ed = parseDate(ev.endDate) || sd;
      const start = new Date(sd + "T00:00:00");
      const end = new Date(ed + "T00:00:00");
      const isMultiDay = start.getTime() !== end.getTime();

      // Collect all grid indices this event touches
      const touchedIndices = [];
      const cur = new Date(start);
      while (cur <= end) {
        if (cur.getDay() !== 0) { // skip Sundays
          const k = dateKey(cur.getFullYear(), cur.getMonth(), cur.getDate());
          const idx = dateToIdx[k];
          if (idx !== undefined) touchedIndices.push(idx);
        }
        cur.setDate(cur.getDate() + 1);
      }

      // Add event to each touched cell
      const firstIdx = touchedIndices[0];
      const lastIdx = touchedIndices[touchedIndices.length - 1];
      for (const idx of touchedIndices) {
        if (!map[idx]) map[idx] = [];
        map[idx].push({
          ...ev,
          isStart: idx === firstIdx,
          isEnd: idx === lastIdx,
          isMultiDay,
        });
      }
    }

    // Assign consistent slot (vertical lane) per event within each row
    const totalRows = Math.ceil(cells.length / 6);
    const rowSlots = {};

    for (let r = 0; r < totalRows; r++) {
      const startIdx = r * 6;
      const endIdx = Math.min(startIdx + 6, cells.length);
      const slots = {};
      let nextSlot = 0;

      const seen = new Set();
      for (let i = startIdx; i < endIdx; i++) {
        const evts = map[i] || [];
        for (const ev of evts) {
          if (!seen.has(ev.id)) {
            seen.add(ev.id);
            slots[ev.id] = nextSlot++;
          }
        }
      }
      rowSlots[r] = slots;
    }

    return { eventsByIdx: map, slotsByRow: rowSlots };
  }, [events, search, cells]);

  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  async function handleDelete() {
    if (!selectedEvent?.id) return;
    await fetch(`${API_BASE}/api/calendar/events/${selectedEvent.id}`, { method: "DELETE" });
    setSelectedEvent(null);
    loadEvents();
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>Calendar</div>
        <div className={styles.headerRight}>
          <button className={styles.filterBtn} title="Filter">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
              <path d="M3 5h14M6 10h8M9 15h2"/>
            </svg>
          </button>
          <button className={styles.addEventBtn} onClick={() => setModalEvent(null)}>
            + Add Event
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Calendar card */}
        <div className={styles.calendarCard}>
          <div className={styles.calToolbar}>
            {user?.role === "Admin" && (
              <div className={styles.searchWrap}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="9" cy="9" r="6"/><path d="M15 15l-3.5-3.5"/>
                </svg>
                <input className={styles.searchInput} placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            )}
            <div className={styles.monthNav}>
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
                        <button
                          key={m}
                          className={`${styles.monthDropItem} ${i === month ? styles.monthDropActive : ""}`}
                          onClick={() => { setMonth(i); setMonthDropOpen(false); }}
                        >
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
          </div>

          <div className={styles.calGrid}>
            <div className={styles.dow}>
              {DOW.map(d => (
                <div key={d} className={`${styles.dowCell} ${d === "Sat" ? styles.dowSat : ""}`}>{d}</div>
              ))}
            </div>

            <div className={styles.grid}>
              {cells.map((cell, idx) => {
                const key = dateKey(cell.year, cell.month, cell.day);
                const isToday = key === todayKey;
                const dayEvents = eventsByIdx[idx] || [];

                // De-duplicate events by id (multi-day events appear multiple times)
                const unique = [];
                const seen = new Set();
                for (const ev of dayEvents) {
                  if (!seen.has(ev.id)) { seen.add(ev.id); unique.push(ev); }
                }

                const shown = unique.slice(0, 2);
                const extra = unique.length - shown.length;
                const hasEvents = unique.length > 0;
                const bgColor = hasEvents ? (EVENT_BG[unique[0].eventType] || "rgba(246,200,71,.15)") : null;

                return (
                  <div
                    key={idx}
                    className={`${styles.dayCell} ${cell.muted ? styles.dayMuted : ""} ${isToday ? styles.dayToday : ""} ${hasEvents ? styles.dayHasEvents : ""}`}
                    style={hasEvents && bgColor && !cell.muted ? { background: bgColor } : undefined}
                  >
                    <div className={styles.dayNum}>{cell.day}</div>
                    {hasEvents && (
                      <div className={styles.dayIndicators}>
                        {shown.map((ev) => {
                          const dotColor = EVENT_DOT[ev.eventType] || "#999";
                          return (
                            <div
                              key={ev.id}
                              className={styles.indicator}
                              onClick={() => { setSelectedDay(null); setSelectedEvent(ev); }}
                            >
                              <span className={styles.indicatorDot} style={{ background: dotColor }} />
                              <span className={styles.indicatorText}>{ev.title}</span>
                            </div>
                          );
                        })}
                        {extra > 0 && (
                          <div className={styles.moreTag} onClick={() => {
                            setSelectedEvent(null);
                            setSelectedDay({ date: key, events: unique });
                          }}>
                            +{extra} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className={styles.rightPanel}>
          {selectedDay && !selectedEvent ? (
            /* -- Day summary (from "+N more" click) -- */
            <>
              <div className={styles.detailPanel}>
                <div className={styles.detailHeader}>
                  <div className={styles.detailHeaderTitle}>Event Details</div>
                  <button className={styles.detailClose} onClick={() => setSelectedDay(null)}>?</button>
                </div>
                <div className={styles.detailBody}>
                  <div className={styles.daySummaryDate}>{formatDate(selectedDay.date)}</div>
                  <div className={styles.daySummaryList}>
                    {selectedDay.events.map(ev => {
                      const dotColor = EVENT_DOT[ev.eventType] || "#999";
                      return (
                        <div
                          key={ev.id}
                          className={styles.daySummaryItem}
                          onClick={() => { setSelectedEvent(ev); }}
                        >
                          <span className={styles.daySummaryDot} style={{ background: dotColor }} />
                          <span className={styles.daySummaryTitle}>{ev.title}</span>
                          <span className={styles.daySummaryType}>{ev.eventType}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className={styles.legend}>
                {EVENT_TYPES.map(t => (
                  <div key={t} className={styles.legendItem}>
                    <div className={`${styles.legendDot} ${styles["dot" + t.replace(/\s/g, "")]}`} />
                    {t}
                  </div>
                ))}
              </div>
            </>
          ) : selectedEvent ? (
            /* -- Single event detail -- */
            <>
              <div className={styles.detailPanel}>
                <div className={styles.detailHeader}>
                  <div className={styles.detailHeaderTitle}>Event Details</div>
                  <button className={styles.detailClose} onClick={() => { setSelectedEvent(null); setSelectedDay(null); }}>?</button>
                </div>

                <div className={styles.detailBody}>
                  {/* Back to day list if came from "+more" */}
                  {selectedDay && (
                    <button className={styles.backToDay} onClick={() => setSelectedEvent(null)}>
                      ? Back to day
                    </button>
                  )}

                  <div className={styles.detailEventRow}>
                    <div className={styles.detailEventIcon}>??</div>
                    <div>
                      <div className={styles.detailEventTitle}>{selectedEvent.title}</div>
                      <div className={styles.detailEventDate}>
                        {formatDate(parseDate(selectedEvent.startDate))}
                        {selectedEvent.endDate && parseDate(selectedEvent.endDate) !== parseDate(selectedEvent.startDate)
                          ? ` — ${formatDate(parseDate(selectedEvent.endDate))}`
                          : ""}
                      </div>
                      {(selectedEvent.startTime || selectedEvent.endTime) && (
                        <div className={styles.detailEventTime}>
                          {formatTime(selectedEvent.startTime)}
                          {selectedEvent.endTime ? ` - ${formatTime(selectedEvent.endTime)}` : ""}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.detailCreatedBy}>
                    Created by {selectedEvent.createdBy
                      ? (allEmployees.find(e => e.code === selectedEvent.createdBy)?.name || selectedEvent.createdBy)
                      : "Admin"}
                  </div>

                  {attendeeDetails.length > 0 && (
                    <>
                      <div className={styles.detailSection}>
                        <span className={styles.detailSectionIcon}>??</span> Attendees
                      </div>
                      <div className={styles.attendeeList}>
                        {attendeeDetails.map(a => (
                          <div key={a.code} className={styles.attendee}>
                            {a.photoUrl
                              ? <img src={a.photoUrl} alt={a.name} className={styles.attendeeAvatarImg} />
                              : <div className={styles.attendeeAvatar} style={{ background: avatarColor(a.name || "?") }}>
                                  {initials(a.name || "?")}
                                </div>
                            }
                            <div className={styles.attendeeName}>{a.name}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {selectedEvent.notes && (
                    <>
                      <div className={styles.detailSection}>
                        <span className={styles.detailSectionIcon}>??</span> Notes
                      </div>
                      <div className={styles.detailNotes}>{selectedEvent.notes}</div>
                    </>
                  )}

                  {(user?.role === "Admin" || (selectedEvent.createdBy && selectedEvent.createdBy === user?.employeeCode)) && (
                    <div className={styles.detailActions}>
                      <button className={styles.editBtn} onClick={() => setModalEvent(selectedEvent)}>Edit</button>
                      <button className={styles.deleteBtn} onClick={handleDelete}>Delete</button>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.legend}>
                {EVENT_TYPES.map(t => (
                  <div key={t} className={styles.legendItem}>
                    <div className={`${styles.legendDot} ${styles["dot" + t.replace(/\s/g, "")]}`} />
                    {t}
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* -- Empty state -- */
            <>
              <div className={styles.panelEmpty}>
                <div className={styles.panelEmptyIcon}>??</div>
                <div className={styles.panelEmptyTitle}>No Event Selected</div>
                <div className={styles.panelEmptyText}>
                  Click on an event in the calendar<br />to see its details.
                </div>
              </div>
              <div className={styles.legend}>
                {EVENT_TYPES.map(t => (
                  <div key={t} className={styles.legendItem}>
                    <div className={`${styles.legendDot} ${styles["dot" + t.replace(/\s/g, "")]}`} />
                    {t}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalEvent !== undefined && (
        <EventModal
          event={modalEvent}
          onClose={() => setModalEvent(undefined)}
          onSaved={() => { setModalEvent(undefined); setSelectedEvent(null); loadEvents(); }}
          allEmployees={allEmployees}
        />
      )}
    </div>
  );
}
