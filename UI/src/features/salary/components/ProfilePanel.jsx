import React from "react";
import Icon from "../../../components/ui/Icon";
import API_BASE from "../../../config";
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
        {profile.photoUrl
          ? <img src={profile.photoUrl} alt={profile.name} className={styles.heroAvatarImg} />
          : <div className={styles.heroAvatar}>{initials(profile.name)}</div>
        }
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
          {docs.length === 0 && (
            <div style={{ fontSize: 12, color: "rgba(0,0,0,.35)", padding: "8px 0" }}>
              No documents uploaded yet.
            </div>
          )}
          {docs.map((d) => {
            const downloadUrl = d.id && profile.code
              ? `${API_BASE}/api/employees/${profile.code}/documents/${d.id}/download`
              : null;
            return (
              <div
                className={`${styles.doc} ${downloadUrl ? styles.docClickable : ""}`}
                key={d.id || d.name}
                onClick={() => downloadUrl && window.open(downloadUrl, "_blank")}
                title={downloadUrl ? `Click to view ${d.name}` : d.name}
              >
                <div
                  className={`${styles.docIcon} ${
                    d.type === "word" ? styles.word : styles.ppt
                  }`}
                >
                  {d.tag || d.type?.[0]?.toUpperCase() || "F"}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.docName}>{d.name}</div>
                  <div className={styles.docSize}>{d.size}</div>
                </div>
              </div>
            );
          })}
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
