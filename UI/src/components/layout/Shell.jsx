import React from "react";
import styles from "./Shell.module.css";

export default function Shell({ children }) {
  return <div className={styles.shell}>{children}</div>;
}
