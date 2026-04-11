import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./Topbar.module.css";
import { getStores } from "../../utils/stores";

const tabs = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Inventory", path: "/inventory" },
  { label: "Sales",     path: "/sales" },
  { label: "Salary",    path: "/salary" },
  { label: "Timesheet", path: "/timesheet" },
  { label: "People",    path: "/people" },
  { label: "Calendar",  path: "/calendar" },
  { label: "Reports",   path: "/reports" },
];

function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "null");
  } catch { return null; }
}

function getAccessibleStores(user) {
  const all = getStores();
  if (!user || user.role === "Admin") return all;
  const raw = user.allowedStores;
  if (!raw || raw.trim() === "") return all;
  const allowed = raw.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
  return all.filter(s => allowed.includes(s.id));
}

export default function Topbar() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const user   = getUser();
  const stores = getAccessibleStores(user);

  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  const storeKey       = `currentStore_${user?.id ?? "guest"}`;
  const currentStoreId = localStorage.getItem(storeKey);
  const currentStore   = stores.find(s => s.id.toString() === currentStoreId) || stores[0] || { id: 1, name: "Store", subtitle: "" };

  // If saved store is not in allowed list, switch to first allowed
  useEffect(() => {
    if (stores.length > 0 && !stores.find(s => s.id.toString() === currentStoreId)) {
      localStorage.setItem(storeKey, stores[0].id.toString());
      window.location.reload();
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectStore = (store) => {
    localStorage.setItem(storeKey, store.id.toString());
    setDropOpen(false);
    window.location.reload();
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    localStorage.removeItem("user");
    nav("/login", { replace: true });
  };

  return (
    <div className={styles.topbar}>

      {/* ── Brand / Store selector ── */}
      <div className={styles.brand} ref={dropRef}>
        <img src="/mr-logo.png" alt="MR Styles and Collections" className={styles.brandLogo} />

        <button
          className={styles.storeDropBtn}
          onClick={() => stores.length > 1 && setDropOpen(o => !o)}
          title={stores.length > 1 ? "Switch store" : ""}
          style={{ cursor: stores.length > 1 ? "pointer" : "default" }}>
          <div className={styles.brandText}>
            <div className={styles.brandTitle}>{currentStore.name.toUpperCase()}</div>
            <div className={styles.brandSubtitle}>{currentStore.subtitle}</div>
          </div>
          {stores.length > 1 && (
            <span className={`${styles.chevron} ${dropOpen ? styles.chevronUp : ""}`}>▾</span>
          )}
        </button>

        {dropOpen && stores.length > 1 && (
          <div className={styles.storeDropdown}>
            <div className={styles.storeDropHeader}>Stores</div>
            {stores.map(s => (
              <div
                key={s.id}
                className={`${styles.storeItem} ${s.id === currentStore.id ? styles.storeItemActive : ""}`}
                onClick={() => selectStore(s)}>
                <span className={styles.storeItemDot} />
                {s.name}
                {s.id === currentStore.id && <span className={styles.storeItemCheck}>✓</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Nav tabs ── */}
      <div className={styles.navPill}>
        {tabs.map((t) => {
          const active = pathname === t.path;
          return (
            <div key={t.path}
              className={`${styles.navItem} ${active ? styles.active : ""}`}
              onClick={() => nav(t.path)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") nav(t.path); }}
              role="button" tabIndex={0}>
              {t.label}
            </div>
          );
        })}
      </div>

      {/* ── Actions ── */}
      <div className={styles.actions}>
        {user?.role === "Admin" && (
          <button
            className={`${styles.actionBtn} ${pathname === "/settings" ? styles.actionBtnActive : ""}`}
            onClick={() => nav("/settings")}
            title="Settings">
            ⚙
          </button>
        )}
        <div className={styles.userInfo}>
          {user?.photoUrl
            ? <img src={user.photoUrl} alt={user.username} className={styles.userAvatarImg} />
            : <div className={styles.userAvatar}>{user?.username?.[0]?.toUpperCase() || "?"}</div>
          }
          <div className={styles.userDetails}>
            <div className={styles.userName}>{user?.employeeName || user?.username}</div>
            <div className={styles.userRole}>{user?.role}</div>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
          ⏏ Logout
        </button>
      </div>
    </div>
  );
}