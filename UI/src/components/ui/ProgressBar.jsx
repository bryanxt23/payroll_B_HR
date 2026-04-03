import React from "react";
import styles from "./ProgressBar.module.css";

export default function ProgressBar({ value = 50 }) {
  return (
    <div className={styles.progressRow}>
      <div className={styles.progressFill} style={{ width: `${value}%` }} />
    </div>
  );
}
