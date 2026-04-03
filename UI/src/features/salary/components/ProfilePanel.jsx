import React from "react";
import Icon from "../../../components/ui/Icon";
import styles from "./ProfilePanel.module.css";

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

export default function ProfilePanel({ profile }) {
  // If profile not yet loaded / missing, show a placeholder (instead of returning null)
  if (!profile) {
    return (
      <div className={styles.right}>
        <div className={styles.hero}>
          <div className={styles.heroAvatar}>--</div>
        </div>
        <div className={styles.profile}>
          <div className={styles.pName}>Select an employee</div>
          <div className={styles.pRole}> </div>
        </div>
      </div>
    );
  }

  const info = Array.isArray(profile.info) ? profile.info : [];
  const docs = Array.isArray(profile.docs) ? profile.docs : [];
  const stats = Array.isArray(profile.stats) ? profile.stats : [];

  return (
    <div className={styles.right}>
      <div className={styles.hero}>
        <div className={styles.heroAvatar}>{initials(profile.name)}</div>
      </div>

      <div className={styles.profile}>
        <div className={styles.pName}>{profile.name}</div>
        <div className={styles.pRole}>{profile.role}</div>

        <div className={styles.blockTitle}>Basic Information</div>
        <div className={styles.infoList}>
          {info.map((row) => (
            <div className={styles.infoRow} key={row.k}>
              <div className={styles.k}>
                {row.icon && <Icon name={row.icon} />}
                {row.k}
              </div>
              <div className={styles.v}>{row.v}</div>
            </div>
          ))}
        </div>

        <div className={styles.blockTitle}>Documents</div>
        <div className={styles.docRow}>
          {docs.map((d) => (
            <div className={styles.doc} key={d.name}>
              <div
                className={`${styles.docIcon} ${
                  d.type === "word" ? styles.word : styles.ppt
                }`}
              >
                {d.tag}
              </div>

              <div style={{ flex: 1 }}>
                <div className={styles.docName}>{d.name}</div>
                <div className={styles.docSize}>{d.size}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.blockTitle}>Statistics</div>
        <div className={styles.stat}>
          {stats.map((s) => (
            <div key={s.label}>
              <div className={styles.statRow}>
                <div>{s.label}</div>
                <div>{s.value}</div>
              </div>

              <div className={styles.miniBar}>
                <div
                  className={`${styles.miniFill} ${
                    s.theme === "dark" ? styles.miniFillDark : ""
                  }`}
                  style={{ width: `${s.fill}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
