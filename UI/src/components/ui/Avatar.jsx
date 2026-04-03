import React from "react";
import styles from "./Avatar.module.css";

function initials(name) {
  if (typeof name !== "string") return "?";

  const cleaned = name.trim();
  if (!cleaned) return "?";

  const parts = cleaned.split(/\s+/).slice(0, 2);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

export default function Avatar({ name }) {
  return <div className={styles.avatar}>{initials(name)}</div>;
}
