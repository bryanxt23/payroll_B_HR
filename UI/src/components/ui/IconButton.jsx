import React from "react";
import Icon from "./Icon";
import styles from "./IconButton.module.css";

export default function IconButton({ icon, title, variant = "pill", onClick }) {
  const cls = variant === "circle" ? styles.circle : styles.pill;
  return (
    <button type="button" className={cls} title={title} onClick={onClick}>
      <Icon name={icon} />
    </button>
  );
}
