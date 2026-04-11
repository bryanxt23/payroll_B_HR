import React, { useState, useRef, useEffect } from "react";
import styles from "./Calendar.module.css";

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

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function CalendarDay({ cell }) {
  const [popupOpen, setPopupOpen] = useState(false);
  const popupRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) setPopupOpen(false);
    }
    if (popupOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [popupOpen]);

  // Collect all event labels into individual items
  const items = [];

  // From employee calendar data (eventLabel is comma-separated)
  if (cell.eventLabel) {
    cell.eventLabel.split(",").map(s => s.trim()).filter(Boolean).forEach(label => {
      // Check if this label matches a global event title
      const matchedGlobal = cell.globalEvents?.find(ev => ev.title === label);
      items.push({
        label,
        type: matchedGlobal?.eventType || null,
        event: matchedGlobal || null,
      });
    });
  }

  // Add global events that aren't already in items
  if (cell.globalEvents) {
    cell.globalEvents.forEach(ev => {
      if (!items.some(it => it.label === ev.title)) {
        items.push({ label: ev.title, type: ev.eventType, event: ev });
      }
    });
  }

  const hasEvents = items.length > 0;
  const shown = items.slice(0, 2);
  const extra = items.length - 2;

  // Background from first event type
  const firstType = items[0]?.type;
  const bgColor = firstType ? EVENT_BG[firstType] || "rgba(246,200,71,.55)" : null;

  const cls = [
    styles.day,
    cell.muted ? styles.muted : "",
    cell.striped ? styles.striped : "",
    hasEvents ? styles.hasEvents : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={cls}
      style={hasEvents && bgColor ? { background: bgColor, cursor: "pointer" } : undefined}
      onClick={() => hasEvents && !cell.muted && setPopupOpen(true)}
    >
      <div className={styles.dayLabel}>{cell.label}</div>

      {hasEvents && (
        <div className={styles.indicators}>
          {shown.map((it, i) => (
            <div key={i} className={styles.indicator}>
              <span
                className={styles.indicatorDot}
                style={{ background: it.type ? EVENT_DOT[it.type] || "#999" : "#c9a227" }}
              />
              <span className={styles.indicatorText}>{it.label}</span>
            </div>
          ))}
          {extra > 0 && (
            <div className={styles.moreTag}>+{extra} more</div>
          )}
        </div>
      )}

      {/* Day detail popup */}
      {popupOpen && (
        <div className={styles.dayPopup} ref={popupRef}>
          <div className={styles.popupHeader}>
            <span className={styles.popupDate}>Day {cell.label}</span>
            <button className={styles.popupClose} onClick={(e) => { e.stopPropagation(); setPopupOpen(false); }}>✕</button>
          </div>
          <div className={styles.popupBody}>
            {items.map((it, i) => (
              <div key={i} className={styles.popupItem}>
                <div className={styles.popupItemHeader}>
                  <span
                    className={styles.popupDot}
                    style={{ background: it.type ? EVENT_DOT[it.type] || "#999" : "#c9a227" }}
                  />
                  <span className={styles.popupTitle}>{it.label}</span>
                  {it.type && <span className={styles.popupType}>{it.type}</span>}
                </div>
                {it.event && (
                  <div className={styles.popupDetails}>
                    {(it.event.startTime || it.event.endTime) && (
                      <div className={styles.popupDetail}>
                        <span className={styles.popupDetailLabel}>Time</span>
                        {formatTime(it.event.startTime)}{it.event.endTime ? ` - ${formatTime(it.event.endTime)}` : ""}
                      </div>
                    )}
                    {it.event.notes && (
                      <div className={styles.popupDetail}>
                        <span className={styles.popupDetailLabel}>Notes</span>
                        {it.event.notes}
                      </div>
                    )}
                    {it.event.affectsSalary && (
                      <div className={styles.popupSalaryBadge}>Affects Salary</div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {items.length === 0 && (
              <div className={styles.popupEmpty}>No events</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
