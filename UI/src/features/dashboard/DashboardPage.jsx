import { useEffect, useMemo, useState } from "react";
import styles from "./DashboardPage.module.css";
import API_BASE from "../../config";

// ─── SVG Icons ──────────────────────────────────────────────────────────────
function IconBox()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>; }
function IconCheck()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>; }
function IconPeople()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IconChart()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function IconWarning()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
function IconClock()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function IconWallet()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>; }
function IconUser()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function IconTag()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>; }

// ─── Smooth Line Chart ───────────────────────────────────────────────────────
function LineChart({ data }) {
  const W = 620, H = 210, pl = 56, pr = 18, pt = 18, pb = 34;
  const cw = W - pl - pr, ch = H - pt - pb;
  const maxVal = Math.max(...data.map(d => d.value), 500);
  const niceMax = Math.ceil(maxVal / 100) * 100;

  const pts = data.map((d, i) => ({
    x: pl + (i / Math.max(data.length - 1, 1)) * cw,
    y: pt + ch - (d.value / niceMax) * ch,
  }));

  const smoothPath = (points) => {
    if (points.length < 2) return `M ${points[0]?.x ?? 0} ${points[0]?.y ?? 0}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p = points[i], n = points[i + 1];
      const cx = (p.x + n.x) / 2;
      d += ` C ${cx} ${p.y}, ${cx} ${n.y}, ${n.x} ${n.y}`;
    }
    return d;
  };

  const linePath = smoothPath(pts);
  const areaPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x} ${pt + ch} L ${pts[0].x} ${pt + ch} Z`
    : "";

  const yTicks = [0.2, 0.5, 0.8].map(v => ({
    value: Math.round(v * niceMax),
    y: pt + ch - v * ch,
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chartSvg}>
      <defs>
        <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="rgba(130,182,136,0.22)" />
          <stop offset="100%" stopColor="rgba(130,182,136,0.03)" />
        </linearGradient>
      </defs>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={pl} y1={t.y} x2={W - pr} y2={t.y} stroke="#ecebe7" strokeWidth="1" />
          <text x={pl - 8} y={t.y + 4} textAnchor="end" fontSize="11" fill="#b6b1aa">₱{t.value}</text>
        </g>
      ))}
      {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
      <path d={linePath} fill="none" stroke="#7cab7f" strokeWidth="2.4" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="5" fill="#fff" stroke="#7cab7f" strokeWidth="2" />
      ))}
      {data.map((d, i) => (
        <text key={i} x={pts[i].x} y={H - 8} textAnchor="middle" fontSize="11" fill="#aaa59d">{d.label}</text>
      ))}
    </svg>
  );
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────
function DonutChart({ inStock, pending, outOfStock }) {
  const total = inStock + pending + outOfStock || 1;
  const cx = 90, cy = 90, r = 58, sw = 18;
  const circ = 2 * Math.PI * r;
  const segments = [
    { value: inStock,    color: "#9fc39d" },
    { value: pending,    color: "#f0c247" },
    { value: outOfStock, color: "#ef8767" },
  ];
  let offset = 0;
  return (
    <svg viewBox="0 0 180 180" className={styles.donutSvg}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3efe8" strokeWidth={sw} />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const node = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={sw}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={circ * 0.25 - offset}
            strokeLinecap="butt"
          />
        );
        offset += dash;
        return node;
      })}
      <circle cx={cx} cy={cy} r="42" fill="#fffdf9" />
      <text x={cx} y={cy - 2}  textAnchor="middle" fontSize="24" fontWeight="700" fill="#232323">{total}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="11" fill="#9b958d">Total Products</text>
    </svg>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [inventory, setInventory] = useState([]);
  const [sales, setSales]         = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [timeFilter, setTimeFilter] = useState("Monthly");
  const [catFilters, setCatFilters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dashSearch, setDashSearch] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/inventory`)
      .then(r => r.json()).then(d => setInventory(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API_BASE}/api/sales`)
      .then(r => r.json()).then(d => setSales(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API_BASE}/api/activity`)
      .then(r => r.json()).then(d => setActivityLog(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API_BASE}/api/categories`)
      .then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d.map(c => c.name) : [])).catch(() => {});
  }, []);

  const fmt = n => Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const MONTHS = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
    const parseDate = (str) => {
      if (!str) return null;
      const m = str.match(/(\w+)\s+(\d+),\s+(\d{4})/);
      if (!m || MONTHS[m[1]] === undefined) return null;
      return new Date(parseInt(m[3]), MONTHS[m[1]], parseInt(m[2]));
    };
    const activeLoans = sales.filter(s => (s.status || "Active") === "Active");
    const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const now = new Date(); now.setHours(0,0,0,0);
    const in7 = new Date(now); in7.setDate(in7.getDate() + 7);
    return {
      totalProducts:   inventory.length,
      itemsAvailable:  inventory.filter(i => i.status === "In Stock").length,
      activeBuyers:    activeLoans.length,
      salesThisMonth:  sales.reduce((s, l) => s + ((l.totalPrice || 0) - (l.remainingBalance || 0)), 0),
      outOfStock:      inventory.filter(i => i.status === "Out of Stock").length,
      pending:         inventory.filter(i => i.status === "Pending").length,
      paymentsDue:     activeLoans.filter(l => { const d = parseDate(l.dueDate); return d && d >= now && d <= in7; }).length,
      lowStockCount:   inventory.filter(i => (i.quantity || 0) <= 5 || i.status === "Out of Stock").length,
      todaySales:      sales.filter(l => l.purchaseDate === todayStr)
                           .reduce((s, l) => s + ((l.totalPrice || 0) - (l.remainingBalance || 0)), 0),
    };
  }, [inventory, sales]);

  // ── Chart data ─────────────────────────────────────────────────────────────
  // Uses totalPrice (sale amount at purchase) so new loans appear immediately.
  // Pads with empty days before the first entry so the chart always spans 7+ points.
  const chartData = useMemo(() => {
    const grouped = {};
    sales.forEach(loan => {
      if (!loan.purchaseDate) return;
      // Show full sale amount (not just collected), so the chart reflects when sales happened
      grouped[loan.purchaseDate] = (grouped[loan.purchaseDate] || 0) + (loan.totalPrice || 0);
    });

    const entries = Object.entries(grouped)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, value]) => ({
        rawDate: date,
        label: (() => { try { return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return date; } })(),
        value,
      }));

    // No data with purchaseDate — show flat placeholder for last 7 days
    if (entries.length === 0) {
      const today = new Date();
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today); d.setDate(d.getDate() - (6 - i));
        return { label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: 0 };
      });
    }

    // Pad with empty days before the earliest entry so we always have 7 points
    const TARGET = 7;
    const result = entries.slice(-TARGET);
    if (result.length < TARGET) {
      const firstDate = new Date(result[0].rawDate);
      const pad = [];
      for (let i = TARGET - result.length; i >= 1; i--) {
        const d = new Date(firstDate);
        d.setDate(d.getDate() - i);
        pad.push({ label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: 0 });
      }
      return [...pad, ...result];
    }
    return result;
  }, [sales]);

  // ── Donut ──────────────────────────────────────────────────────────────────
  const donut = useMemo(() => ({
    inStock:    inventory.filter(i => i.status === "In Stock").length,
    pending:    inventory.filter(i => i.status === "Pending").length,
    outOfStock: inventory.filter(i => i.status === "Out of Stock").length,
  }), [inventory]);

  // ── Time-ago helper ────────────────────────────────────────────────────────
  const timeAgo = (isoStr) => {
    if (!isoStr) return "";
    const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (diff < 60)   return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? "s" : ""} ago`;
  };

  // ── Low stock ──────────────────────────────────────────────────────────────
  const [lightboxImg, setLightboxImg] = useState(null);
  const [showAllLowStock, setShowAllLowStock] = useState(false);
  const lowStockItems = useMemo(() => {
    const search = dashSearch.trim().toLowerCase();
    return inventory
      .filter(i => (i.quantity || 0) <= 5 || i.status === "Out of Stock")
      .filter(i => catFilters.length === 0 || catFilters.includes(i.category))
      .filter(i => !search || (i.name || "").toLowerCase().includes(search));
  }, [inventory, catFilters, dashSearch]);

  const toggleCat = cat => setCatFilters(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>

        {/* ══ Main Card ════════════════════════════════════════════════════ */}
        <section className={styles.mainCard}>

          {/* Header */}
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Dashboard</h1>
            {/* <div className={styles.timeToggle}>
              {["Today", "Monthly", "All"].map(t => (
                <button key={t}
                  className={`${styles.toggleBtn} ${timeFilter === t ? styles.activeToggle : ""}`}
                  onClick={() => setTimeFilter(t)}
                >
                  {t === "Today" && <span className={styles.todayDot} />}{t}
                </button>
              ))}
            </div> */}
          </div>

          {/* 4 Stat Cards */}
          <div className={styles.statCards}>
            <div className={styles.statCard}>
              <div className={`${styles.iconWrap} ${styles.iconOrange}`}><IconBox /></div>
              <div className={styles.statVal}>{stats.totalProducts}</div>
              <div className={styles.statLbl}>Total Products</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.iconWrap} ${styles.iconGreen}`}><IconCheck /></div>
              <div className={styles.statVal}>{stats.itemsAvailable}</div>
              <div className={styles.statLbl}>Items Available</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.iconWrap} ${styles.iconGold}`}><IconPeople /></div>
              <div className={styles.statVal}>{stats.activeBuyers}</div>
              <div className={styles.statLbl}>Active Buyers</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.iconWrap} ${styles.iconGreenAlt}`}><IconChart /></div>
              <div className={styles.statVal}>₱{fmt(stats.salesThisMonth)}</div>
              <div className={styles.statLbl}>Sales This Month</div>
            </div>
          </div>

          {/* Alert Bar */}
          <div className={styles.alertBar}>
            <div className={styles.alertItem}>
              <span className={`${styles.alertIcon} ${styles.alertOrange}`}><IconTag /></span>
              <span className={styles.alertCount}>{stats.lowStockCount}</span>
              <span className={styles.alertTxt}>Low Stock Items</span>
            </div>
            <div className={styles.alertDivider} />
            <div className={styles.alertItem}>
              <span className={`${styles.alertIcon} ${styles.alertRed}`}><IconWarning /></span>
              <span className={styles.alertCount}>{stats.outOfStock}</span>
              <span className={styles.alertTxt}>Out of Stock</span>
            </div>
            <div className={styles.alertDivider} />
            <div className={styles.alertItem}>
              <span className={`${styles.alertIcon} ${styles.alertGold}`}><IconClock /></span>
              <span className={styles.alertCount}>{stats.pending}</span>
              <span className={styles.alertTxt}>Pending Orders</span>
            </div>
            <div className={styles.alertDivider} />
            <div className={styles.alertItem}>
              <span className={`${styles.alertIcon} ${styles.alertGold}`}><IconWallet /></span>
              <span className={styles.alertCount}>{stats.paymentsDue}</span>
              <span className={styles.alertTxt}>Payments Due This Week</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className={styles.chartsRow}>

            {/* Sales Overview */}
            <div className={styles.chartCard}>
              <div className={styles.chartCardHeader}>
                <span className={styles.chartTitle}>Sales Overview</span>
                {/* <div className={styles.chartTabs}>
                  {["Daily", "Weekly", "Monthly", "All Time"].map(t => (
                    <button key={t} type="button"
                      className={`${styles.chartTab} ${t === timeFilter ? styles.chartTabActive : ""}`}
                      onClick={() => setTimeFilter(t)}
                    >{t}</button>
                  ))}
                </div> */}
              </div>
              <div className={styles.chartTotal}>
                <div className={styles.chartTotalVal}>₱{fmt(stats.salesThisMonth)}</div>
                <div className={styles.chartTotalLbl}>Total Sales This Month</div>
              </div>
              <LineChart data={chartData} />
            </div>

            {/* Inventory Status */}
            <div className={styles.chartCard}>
              <div className={styles.chartCardHeader}>
                <span className={styles.chartTitle}>Inventory Status</span>
              </div>
              <div className={styles.donutRow}>
                <div className={styles.donutLegend}>
                  <div className={styles.legendItem}><span className={`${styles.dot} ${styles.dotGreen}`} />In Stock</div>
                  <div className={styles.legendItem}><span className={`${styles.dot} ${styles.dotGold}`} />Pending</div>
                  <div className={styles.legendItem}><span className={`${styles.dot} ${styles.dotRed}`} />Out of Stock</div>
                  <div className={styles.legendTotal}>₱{fmt(stats.salesThisMonth)}</div>
                  <div className={styles.legendTotalLbl}>Sales This Month</div>
                </div>
                <div className={styles.donutWrap}>
                  <DonutChart inStock={donut.inStock} pending={donut.pending} outOfStock={donut.outOfStock} />
                  <div className={styles.donutFooter}>
                    <span className={styles.footerItem}><span className={`${styles.dot} ${styles.dotGreen}`} />In Stock</span>
                    <span className={styles.footerItem}><span className={`${styles.dot} ${styles.dotGold}`} />Pending</span>
                    <span className={styles.footerItem}><span className={`${styles.dot} ${styles.dotRed}`} />Q.{donut.outOfStock}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Row */}
          <div className={styles.bottomRow}>

            {/* Recent Activity */}
            <div className={styles.bottomCard}>
              <div className={styles.bottomCardHeader}>
                <span className={styles.bottomCardTitle}>Recent Activity</span>
                <button className={styles.viewAllBtn} onClick={() => setShowAllActivity(true)}><span className={styles.viewAllIcon}>↑</span> View All</button>
              </div>
              <div className={styles.activityList}>
                {activityLog.length === 0 && <div className={styles.emptyMsg}>No recent activity.</div>}
                {activityLog.slice(0, 5).map((act, i) => (
                  <div key={act.id ?? i} className={styles.activityRow}>
                    <div className={`${styles.activityIcon} ${
                      act.icon === "payment"    ? styles.actIconGreen :
                      act.icon === "outofstock" ? styles.actIconRed   :
                      act.icon === "inventory"  ? styles.actIconGold  : styles.actIconBlue
                    }`}>
                      {act.icon === "payment"    ? <IconWallet />  :
                       act.icon === "outofstock" ? <IconWarning /> :
                       act.icon === "inventory"  ? <IconBox />     : <IconUser />}
                    </div>
                    <div className={styles.activityText}>
                      <span className={styles.actName}>{act.entityName}</span>
                      <span className={styles.actAction}> {act.action}</span>
                    </div>
                    <div className={styles.actTime}>{timeAgo(act.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Modal */}
            {showAllActivity && (
              <div className={styles.modalOverlay} onClick={() => setShowAllActivity(false)}>
                <div className={styles.activityModal} onClick={e => e.stopPropagation()}>
                  <div className={styles.activityModalHeader}>
                    <span className={styles.bottomCardTitle}>Recent Activity</span>
                    <button className={styles.modalCloseBtn} onClick={() => setShowAllActivity(false)}>✕</button>
                  </div>
                  <div className={styles.activityModalList}>
                    {activityLog.length === 0 && <div className={styles.emptyMsg}>No recent activity.</div>}
                    {activityLog.map((act, i) => (
                      <div key={act.id ?? i} className={styles.activityRow}>
                        <div className={`${styles.activityIcon} ${
                          act.icon === "payment"    ? styles.actIconGreen :
                          act.icon === "outofstock" ? styles.actIconRed   :
                          act.icon === "inventory"  ? styles.actIconGold  : styles.actIconBlue
                        }`}>
                          {act.icon === "payment"    ? <IconWallet />  :
                           act.icon === "outofstock" ? <IconWarning /> :
                           act.icon === "inventory"  ? <IconBox />     : <IconUser />}
                        </div>
                        <div className={styles.activityText}>
                          <span className={styles.actName}>{act.entityName}</span>
                          <span className={styles.actAction}> {act.action}</span>
                        </div>
                        <div className={styles.actTime}>{timeAgo(act.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Low Stock Items */}
            <div className={styles.bottomCard}>
              <div className={styles.bottomCardHeader}>
                <span className={styles.bottomCardTitle}>Low Stock Items</span>
                <button className={styles.viewAllBtn} onClick={() => setShowAllLowStock(true)}>View All</button>
              </div>
              <div className={styles.lowStockGrid}>
                {lowStockItems.length === 0 && <div className={styles.emptyMsg}>No low stock items.</div>}
                {lowStockItems.slice(0, 6).map((item, i) => (
                  <div key={item.id || i} className={styles.lowStockItem}>
                    {item.image
                      ? <img src={item.image} alt={item.name} className={styles.lowStockImg} onClick={() => setLightboxImg(item.image)} title="Click to enlarge" />
                      : <div className={styles.lowStockImgPlaceholder}><IconBox /></div>
                    }
                    <div className={styles.lowStockInfo}>
                      <div className={styles.lowStockName}>{item.name}</div>
                      <div className={styles.lowStockQty}>Qty {item.quantity ?? 0}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Low Stock Modal */}
            {showAllLowStock && (
              <div className={styles.modalOverlay} onClick={() => setShowAllLowStock(false)}>
                <div className={styles.activityModal} onClick={e => e.stopPropagation()}>
                  <div className={styles.activityModalHeader}>
                    <span className={styles.bottomCardTitle}>Low Stock Items</span>
                    <button className={styles.modalCloseBtn} onClick={() => setShowAllLowStock(false)}>✕</button>
                  </div>
                  <div className={styles.activityModalList}>
                    {lowStockItems.length === 0 && <div className={styles.emptyMsg}>No low stock items.</div>}
                    {lowStockItems.map((item, i) => (
                      <div key={item.id || i} className={styles.lowStockItem}>
                        {item.image
                          ? <img src={item.image} alt={item.name} className={styles.lowStockImg} onClick={() => setLightboxImg(item.image)} title="Click to enlarge" />
                          : <div className={styles.lowStockImgPlaceholder}><IconBox /></div>
                        }
                        <div className={styles.lowStockInfo}>
                          <div className={styles.lowStockName}>{item.name}</div>
                          <div className={styles.lowStockQty}>Qty {item.quantity ?? 0}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </section>

        {/* ══ Filter Panel ══════════════════════════════════════════════════ */}
        <aside className={styles.filterPanel}>
          <div className={styles.filterPanelHeader}>
            <span className={styles.filterPanelIcon}>⚙</span>
            <span className={styles.filterPanelTitle}>Filters</span>
          </div>

          <div className={`${styles.strip} ${styles.stripGreen}`}>
            <span>Today Sales</span>
            <span className={styles.stripVal}>₱{fmt(stats.todaySales)}</span>
          </div>
          <div className={`${styles.strip} ${styles.stripOlive}`}>
            <span>Monthly Sales</span>
            <span className={styles.stripVal}>₱{fmt(stats.salesThisMonth)}</span>
          </div>
          <div className={`${styles.strip} ${styles.stripGold}`}>
            <span>Low Stock Count</span>
            <span className={styles.stripVal}>{stats.lowStockCount}</span>
          </div>

          <div className={styles.filterCard}>
            <div className={styles.filterCardTitle}>Search</div>
            <div className={styles.searchBox}>
              <span className={styles.searchIcon}>⌕</span>
              <input type="text" placeholder="Search low stock items..." className={styles.searchInput}
                value={dashSearch} onChange={e => setDashSearch(e.target.value)} />
            </div>
          </div>

          <div className={styles.filterCard}>
            <div className={styles.filterCardTitle}>Category</div>
            <div className={styles.catList}>
              {categories.map(cat => (
                <label key={cat} className={styles.catRow}>
                  <input type="checkbox" checked={catFilters.includes(cat)} onChange={() => toggleCat(cat)} className={styles.catCheck} />
                  <span className={styles.catLabel}>{cat}</span>
                  <span className={styles.catChev}>›</span>
                </label>
              ))}
            </div>
          </div>

          <button className={styles.viewFiltersBtn} onClick={() => {
            setDashSearch(""); setCatFilters([]);
          }}>Clear Filters</button>
        </aside>

      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,cursor:"zoom-out" }}
          onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="" style={{ maxWidth:"90vw",maxHeight:"90vh",borderRadius:12,boxShadow:"0 8px 40px rgba(0,0,0,0.5)" }} />
        </div>
      )}
    </div>
  );
}
