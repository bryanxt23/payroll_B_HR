import React from "react";
import styles from "./MainGrid.module.css";

export default function MainGrid({ children }) {
  return <div className={styles.main}>{children}</div>;
}
