import React from "react";
import styles from "./Calendar.module.css";

export default function CalendarDay({ cell }) {
  const cls = [
    styles.day,
    cell.muted ? styles.muted : "",
    cell.striped ? styles.striped : "",
    cell.event ? styles.event : "",
  ]
    .filter(Boolean)
    .join(" ");


  return (
    <div className={cls}>
      {cell.label}
      {cell.event && <div className={styles.badge}>{cell.eventLabel}</div>}
    </div>
  );
}
