// SidebarEmployees.jsx
import React from "react";
import Avatar from "../../../components/ui/Avatar";
import ProgressBar from "../../../components/ui/ProgressBar";
import Icon from "../../../components/ui/Icon";
import styles from "./SidebarEmployees.module.css";

function buildPagerPages(page, totalPages) {
  // return array like [0,1,2,'...',7]
  if (totalPages <= 8) return Array.from({ length: totalPages }, (_, i) => i);

  const last = totalPages - 1;
  const windowStart = Math.max(1, page - 1);
  const windowEnd = Math.min(last - 1, page + 1);

  const pages = [0];

  if (windowStart > 1) pages.push("...");

  for (let i = windowStart; i <= windowEnd; i++) pages.push(i);

  if (windowEnd < last - 1) pages.push("...");

  pages.push(last);
  return pages;
}

export default function SidebarEmployees({
  employees,
  selectedCode,
  onSelect,
  page,
  totalPages,
  onPageChange,
}) {
  const pages = buildPagerPages(page, totalPages);

  return (
    <div className={styles.left}>
      <div className={styles.sectionTitle}>Salary</div>

      <div className={styles.leftCard}>
        {employees.map((e) => (
          <div
            key={e.code}
            className={`${styles.emp} ${e.code === selectedCode ? styles.empActive : ""}`}
            onClick={() => onSelect(e.code)}
            role="button"
            tabIndex={0}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") onSelect(e.code);
            }}
          >
            <Avatar name={e.name ?? e.code} />

            <div className={styles.empInfo}>
              <div className={styles.empName}>{e.name}</div>
              <div className={styles.empRole}>{e.role}</div>
              <ProgressBar value={typeof e.pct === "number" ? e.pct : 0} />
            </div>
          </div>
        ))}

        <div className={styles.pager}>
          <div
            className={styles.arrow}
            role="button"
            tabIndex={0}
            onClick={() => onPageChange(Math.max(0, page - 1))}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ")
                onPageChange(Math.max(0, page - 1));
            }}
            style={{
              opacity: page === 0 ? 0.4 : 1,
              pointerEvents: page === 0 ? "none" : "auto",
            }}
          >
            <Icon name="left" />
          </div>

          <div className={styles.pagerNums}>
            {pages.map((p, idx) =>
              p === "..." ? (
                <div key={`dots-${idx}`} style={{ opacity: 0.6, padding: "0 6px" }}>
                  …
                </div>
              ) : (
                <div
                  key={p}
                  className={`${styles.pagerNum} ${p === page ? styles.pagerNumActive : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onPageChange(p)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") onPageChange(p);
                  }}
                >
                  {p + 1}
                </div>
              )
            )}
          </div>

          <div
            className={styles.arrow}
            role="button"
            tabIndex={0}
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ")
                onPageChange(Math.min(totalPages - 1, page + 1));
            }}
            style={{
              opacity: page >= totalPages - 1 ? 0.4 : 1,
              pointerEvents: page >= totalPages - 1 ? "none" : "auto",
            }}
          >
            <Icon name="right" />
          </div>
        </div>
      </div>
    </div>
  );
}