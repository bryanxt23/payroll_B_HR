import { useEffect, useMemo, useState } from "react";
import styles from "./ReportsPage.module.css";
import API from "../../config";
import { isAdmin } from "../../utils/permissions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
const PAGE_SIZE = 15;

const ACTION_COLORS = {
  Added:        { bg: "#d1fae5", color: "#065f46" },
  Paid:         { bg: "#dbeafe", color: "#1e40af" },
  Edited:       { bg: "#fef3c7", color: "#92400e" },
  Deleted:      { bg: "#fee2e2", color: "#991b1b" },
  "Stock Update": { bg: "#ede9fe", color: "#5b21b6" },
};

function buildPagerPages(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
  const last = totalPages - 1;
  if (page <= 3)        return [0, 1, 2, 3, 4, "...", last];
  if (page >= last - 3) return [0, "...", last-4, last-3, last-2, last-1, last];
  return                       [0, "...", page-1, page, page+1, "...", last];
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function parseSaleTarget(value) {
  const label = (value || "").trim();
  if (!label) return { buyer: "Unknown", item: "Unknown" };
  const parts = label.split("/").map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return { buyer: "Unknown", item: "Unknown" };
  if (parts.length === 1) return { buyer: "Unknown", item: parts[0] };
  return { buyer: parts[0] || "Unknown", item: parts.slice(1).join(" / ") || "Unknown" };
}

const fmt = n => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const GOLD  = [193, 148, 28];
const LGOLD = [255, 248, 220];
const GRAY  = [100, 100, 100];

function pdfHeader(doc, title, dateFrom, dateTo) {
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont(undefined, "bold");
  doc.text(title, 14, 14);
  const dateRange = dateFrom || dateTo
    ? `${dateFrom || "—"}  to  ${dateTo || "—"}`
    : "All time";
  doc.setFontSize(9); doc.setFont(undefined, "normal");
  doc.text(dateRange, doc.internal.pageSize.getWidth() - 14, 14, { align: "right" });
  doc.setTextColor(0, 0, 0);
  return 28; // y cursor after header
}

function sectionTitle(doc, text, y) {
  doc.setFontSize(11); doc.setFont(undefined, "bold");
  doc.setTextColor(...GRAY);
  doc.text(text.toUpperCase(), 14, y);
  doc.setTextColor(0, 0, 0);
  return y + 5;
}

function exportSalesPDF(filteredSales, dateFrom, dateTo) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = pdfHeader(doc, "Sales Report", dateFrom, dateTo);

  // ── Summary stats ──────────────────────────────────────────────────
  const total     = filteredSales.reduce((s, l) => s + (l.totalPrice || 0), 0);
  const paid      = filteredSales.reduce((s, l) => s + ((l.totalPrice || 0) - (l.remainingBalance || 0)), 0);
  const remaining = filteredSales.reduce((s, l) => s + (l.remainingBalance || 0), 0);

  y = sectionTitle(doc, "Summary", y);
  autoTable(doc, {
    startY: y,
    head: [["Total Sales", "Transactions", "Paid", "Remaining"]],
    body: [[
      `P${total.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`,
      filteredSales.length,
      `P${paid.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`,
      `P${remaining.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`,
    ]],
    headStyles: { fillColor: GOLD, textColor: 255, fontStyle: "bold" },
    bodyStyles: { fillColor: LGOLD },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Top Selling Items ──────────────────────────────────────────────
  const itemMap = {};
  filteredSales.forEach(l => {
    const item = (l.item || "Unknown").trim();
    if (!itemMap[item]) itemMap[item] = { count: 0, total: 0 };
    itemMap[item].count += 1;
    itemMap[item].total += (l.totalPrice || 0);
  });
  const topItems = Object.entries(itemMap)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, d], i) => [i + 1, name, d.count, `P${d.total.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`]);

  y = sectionTitle(doc, "Top Selling Items", y);
  autoTable(doc, {
    startY: y,
    head: [["#", "Item", "Sales", "Total"]],
    body: topItems.length ? topItems : [["", "No data", "", ""]],
    headStyles: { fillColor: GOLD, textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 20 }, 3: { cellWidth: 35 } },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Top Buyers ─────────────────────────────────────────────────────
  const buyerMap = {};
  filteredSales.forEach(l => {
    const buyer = (l.customerName || "Unknown").trim();
    if (!buyerMap[buyer]) buyerMap[buyer] = { count: 0, total: 0 };
    buyerMap[buyer].count += 1;
    buyerMap[buyer].total += (l.totalPrice || 0);
  });
  const topBuyers = Object.entries(buyerMap)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, d], i) => [i + 1, name, d.count, `P${d.total.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`]);

  y = sectionTitle(doc, "Top Buyers", y);
  autoTable(doc, {
    startY: y,
    head: [["#", "Buyer", "Orders", "Total"]],
    body: topBuyers.length ? topBuyers : [["", "No data", "", ""]],
    headStyles: { fillColor: GOLD, textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 20 }, 3: { cellWidth: 35 } },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── All Transactions ───────────────────────────────────────────────
  doc.addPage();
  y = pdfHeader(doc, "Sales Report — All Transactions", dateFrom, dateTo);
  y = sectionTitle(doc, "Transactions", y);
  const txRows = [...filteredSales]
    .sort((a, b) => (b.totalPrice || 0) - (a.totalPrice || 0))
    .map(l => [
      l.customerName || "—",
      l.item || "—",
      `P${(l.totalPrice || 0).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`,
      `P${(l.remainingBalance || 0).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`,
      l.purchaseDate || "—",
      l.status || "—",
    ]);
  autoTable(doc, {
    startY: y,
    head: [["Customer", "Item", "Total", "Remaining", "Date", "Status"]],
    body: txRows.length ? txRows : [["No data", "", "", "", "", ""]],
    headStyles: { fillColor: GOLD, textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  doc.save("sales_report.pdf");
}

function exportInventoryPDF(filteredItems, adminView, dateFrom, dateTo) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = pdfHeader(doc, "Inventory Report", dateFrom, dateTo);

  // ── Summary stats ──────────────────────────────────────────────────
  const inStock  = filteredItems.filter(i => i.status === "In Stock").length;
  const lowStock = filteredItems.filter(i => (i.quantity || 0) <= 5 || i.status === "Out of Stock").length;
  const value    = filteredItems.reduce((s, i) => s + (i.sellingPrice || i.price || 0) * (i.quantity || 0), 0);

  y = sectionTitle(doc, "Summary", y);
  autoTable(doc, {
    startY: y,
    head: [["Total Products", "In Stock", "Low / Out of Stock", "Inventory Value"]],
    body: [[
      filteredItems.length,
      inStock,
      lowStock,
      `P${value.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`,
    ]],
    headStyles: { fillColor: GOLD, textColor: 255, fontStyle: "bold" },
    bodyStyles: { fillColor: LGOLD },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Low Stock Items ────────────────────────────────────────────────
  const lowItems = filteredItems
    .filter(i => (i.quantity || 0) <= 5 || i.status === "Out of Stock")
    .sort((a, b) => (a.quantity || 0) - (b.quantity || 0))
    .map(i => [i.name || "—", i.quantity ?? 0, i.status || "—"]);

  y = sectionTitle(doc, "Low Stock Items", y);
  autoTable(doc, {
    startY: y,
    head: [["Item", "Qty", "Status"]],
    body: lowItems.length ? lowItems : [["No low stock items", "", ""]],
    headStyles: { fillColor: GOLD, textColor: 255, fontStyle: "bold" },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Top Suppliers (admin only) ─────────────────────────────────────
  if (adminView) {
    const stats = {};
    filteredItems.forEach(item => {
      const s = (item.supplier || "Unknown").trim();
      if (!stats[s]) stats[s] = { count: 0, quantity: 0 };
      stats[s].count    += 1;
      stats[s].quantity += (item.quantity || 0);
    });
    const suppliers = Object.entries(stats)
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .map(([s, d], i) => [i + 1, s, d.count, d.quantity]);

    y = sectionTitle(doc, "Top Suppliers", y);
    autoTable(doc, {
      startY: y,
      head: [["#", "Supplier", "Items", "Qty"]],
      body: suppliers.length ? suppliers : [["", "No suppliers", "", ""]],
      headStyles: { fillColor: GOLD, textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 10 } },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── All Items ──────────────────────────────────────────────────────
  doc.addPage();
  y = pdfHeader(doc, "Inventory Report — All Items", dateFrom, dateTo);
  y = sectionTitle(doc, "All Items", y);
  const cols = adminView
    ? ["Item", "Category", "Qty", "Cost", "Selling Price", "Supplier", "Status"]
    : ["Item", "Category", "Qty", "Cost", "Selling Price", "Status"];
  const allRows = [...filteredItems]
    .sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
    .map(i => adminView
      ? [i.name||"—", i.category||"—", i.quantity??0, `P${(i.price||0).toLocaleString()}`, `P${(i.sellingPrice||0).toLocaleString()}`, i.supplier||"—", i.status||"—"]
      : [i.name||"—", i.category||"—", i.quantity??0, `P${(i.price||0).toLocaleString()}`, `P${(i.sellingPrice||0).toLocaleString()}`, i.status||"—"]
    );
  autoTable(doc, {
    startY: y,
    head: [cols],
    body: allRows.length ? allRows : [Array(cols.length).fill("")],
    headStyles: { fillColor: GOLD, textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  doc.save("inventory_report.pdf");
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className={styles.statCard} style={accent ? { borderTop: `3px solid ${accent}` } : {}}>
      <span className={styles.statIcon}>{icon}</span>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("Sales");
  const [salesLogs, setSalesLogs]         = useState([]);
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [sales, setSales]                 = useState([]);
  const [search, setSearch]               = useState("");
  const [dateFrom, setDateFrom]           = useState("");
  const [dateTo, setDateTo]               = useState("");
  const [actionFilter, setActionFilter]   = useState([]);
  const [page, setPage]                   = useState(0);

  useEffect(() => {
    fetch(`${API}/api/activity/report?category=SALES`)
      .then(r => r.json()).then(d => setSalesLogs(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/activity/report?category=INVENTORY`)
      .then(r => r.json()).then(d => setInventoryLogs(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/inventory`)
      .then(r => r.json()).then(d => setInventoryItems(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/sales`)
      .then(r => r.json()).then(d => setSales(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const rawLogs = activeTab === "Sales" ? salesLogs : inventoryLogs;

  const actionTypes = useMemo(() => {
    const set = new Set(rawLogs.map(l => l.actionType).filter(Boolean));
    return Array.from(set).sort();
  }, [rawLogs]);

  // ── Parse "MMM d, yyyy" purchaseDate reliably ─────────────────────
  const parsePurchaseDate = str => {
    if (!str) return null;
    const MONTHS = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
    const m = str.match(/^(\w{3})\s+(\d{1,2}),\s+(\d{4})$/);
    if (m && MONTHS[m[1]] !== undefined)
      return new Date(parseInt(m[3]), MONTHS[m[1]], parseInt(m[2]));
    const fallback = new Date(str);
    return isNaN(fallback) ? null : fallback;
  };

  // ── Date-filtered slices used for summary stats ────────────────────
  const filteredSales = useMemo(() => {
    if (!dateFrom && !dateTo) return sales;
    const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const to   = dateTo   ? new Date(dateTo   + "T23:59:59") : null;
    return sales.filter(l => {
      const d = parsePurchaseDate(l.purchaseDate);
      if (!d) return false;
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    });
  }, [sales, dateFrom, dateTo]);

  const filteredInventoryItems = useMemo(() => {
    if (!dateFrom && !dateTo) return inventoryItems;
    const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const to   = dateTo   ? new Date(dateTo   + "T23:59:59") : null;
    return inventoryItems.filter(i => {
      if (!i.createdAt) return false;
      const d = new Date(i.createdAt);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    });
  }, [inventoryItems, dateFrom, dateTo]);

  // ── Sales summary stats ────────────────────────────────────────────
  const salesStats = useMemo(() => {
    const total     = filteredSales.reduce((s, l) => s + (l.totalPrice || 0), 0);
    const paid      = filteredSales.reduce((s, l) => s + ((l.totalPrice || 0) - (l.remainingBalance || 0)), 0);
    const remaining = filteredSales.reduce((s, l) => s + (l.remainingBalance || 0), 0);
    return { total, count: filteredSales.length, paid, remaining };
  }, [filteredSales]);

  const topSalesItems = useMemo(() => {
    const map = {};
    filteredSales.forEach(l => {
      const item = (l.item || "Unknown").trim();
      if (!map[item]) map[item] = { count: 0, total: 0 };
      map[item].count += 1;
      map[item].total += (l.totalPrice || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, data]) => ({ name, count: data.count, total: data.total }));
  }, [filteredSales]);

  const topSalesBuyers = useMemo(() => {
    const map = {};
    filteredSales.forEach(l => {
      const buyer = (l.customerName || "Unknown").trim();
      if (!map[buyer]) map[buyer] = { count: 0, total: 0 };
      map[buyer].count += 1;
      map[buyer].total += (l.totalPrice || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, data]) => ({ name, count: data.count, total: data.total }));
  }, [filteredSales]);

  // ── Inventory summary stats ────────────────────────────────────────
  const invStats = useMemo(() => {
    const total    = filteredInventoryItems.length;
    const inStock  = filteredInventoryItems.filter(i => i.status === "In Stock").length;
    const lowStock = filteredInventoryItems.filter(i => (i.quantity || 0) <= 5 || i.status === "Out of Stock").length;
    const value    = filteredInventoryItems.reduce((s, i) => s + (i.sellingPrice || i.price || 0) * (i.quantity || 0), 0);
    return { total, inStock, lowStock, value };
  }, [filteredInventoryItems]);

  const lowStockItems = useMemo(() => {
    return filteredInventoryItems
      .filter(i => (i.quantity || 0) <= 5 || i.status === "Out of Stock")
      .sort((a, b) => (a.quantity || 0) - (b.quantity || 0))
      .slice(0, 5);
  }, [filteredInventoryItems]);

  const topSuppliers = useMemo(() => {
    const stats = {};
    filteredInventoryItems.forEach(item => {
      const supplier = (item.supplier || "Unknown Supplier").trim() || "Unknown Supplier";
      const qty = Number(item.quantity || 0);
      if (!stats[supplier]) stats[supplier] = { count: 0, quantity: 0 };
      stats[supplier].count += 1;
      stats[supplier].quantity += qty;
    });
    return Object.entries(stats)
      .map(([supplier, data]) => ({ supplier, count: data.count, quantity: data.quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredInventoryItems]);

  // ── Activity log filtering ─────────────────────────────────────────
  const filtered = useMemo(() => {
    return rawLogs.filter(log => {
      if (search) {
        const q = search.toLowerCase();
        const inUser   = (log.username   || "").toLowerCase().includes(q);
        const inTarget = (log.targetName || log.entityName || "").toLowerCase().includes(q);
        const inDetail = (log.details    || log.action     || "").toLowerCase().includes(q);
        const inAction = (log.actionType || "").toLowerCase().includes(q);
        if (!inUser && !inTarget && !inDetail && !inAction) return false;
      }
      if (actionFilter.length > 0 && !actionFilter.includes(log.actionType)) return false;
      if (dateFrom) {
        const logDate = new Date(log.createdAt).toISOString().slice(0, 10);
        if (logDate < dateFrom) return false;
      }
      if (dateTo) {
        const logDate = new Date(log.createdAt).toISOString().slice(0, 10);
        if (logDate > dateTo) return false;
      }
      return true;
    });
  }, [rawLogs, search, actionFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedData  = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pagerPages = buildPagerPages(page, totalPages);

  const toggleAction = (a) =>
    setActionFilter(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);

  const clearFilters = () => {
    setSearch(""); setDateFrom(""); setDateTo(""); setActionFilter([]); setPage(0);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab); setPage(0); setActionFilter([]);
  };

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>

        {/* ══ Main Card ══════════════════════════════════════════════ */}
        <section className={styles.mainCard}>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Reports</h1>
            <div className={styles.headerRight}>
              <div className={styles.searchWrap}>
                <span className={styles.searchIcon}>⌕</span>
                <input
                  className={styles.searchInput}
                  placeholder="Search user, item, details..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                />
              </div>
              <button
                className={styles.exportBtn}
                onClick={() => {
                  if (activeTab === "Sales") {
                    exportSalesPDF(filteredSales, dateFrom, dateTo);
                  } else {
                    exportInventoryPDF(filteredInventoryItems, isAdmin(), dateFrom, dateTo);
                  }
                }}
              >
                ⬇ Export PDF
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabsRow}>
            {["Sales", "Inventory"].map(tab => (
              <button
                key={tab}
                className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ""}`}
                onClick={() => handleTabChange(tab)}
              >
                {tab}
                <span className={`${styles.tabCount} ${activeTab === tab ? styles.tabCountActive : ""}`}>
                  {tab === "Sales" ? salesLogs.length : inventoryLogs.length}
                </span>
              </button>
            ))}
          </div>

          {/* ── Summary section ─────────────────────────────────── */}
          <div className={styles.summarySection}>

            {/* Stat cards */}
            <div className={styles.statCards}>
              {activeTab === "Sales" ? (
                <>
                  <StatCard icon="💰" label="Total Sales" value={`₱${fmt(salesStats.total)}`} accent="#c9a84c" />
                  <StatCard icon="📋" label="Transactions" value={salesStats.count} accent="#7cab7f" />
                  <StatCard icon="✓" label="Paid" value={`₱${fmt(salesStats.paid)}`} accent="#9fc39d" />
                  <StatCard icon="⏳" label="Remaining" value={`₱${fmt(salesStats.remaining)}`} accent="#ef8767" />
                </>
              ) : (
                <>
                  <StatCard icon="📦" label="Total Products" value={invStats.total} accent="#c9a84c" />
                  <StatCard icon="✓" label="In Stock" value={invStats.inStock} accent="#7cab7f" />
                  <StatCard icon="⚠" label="Low Stock" value={invStats.lowStock} accent="#f0c247" />
                  <StatCard icon="💵" label="Inventory Value" value={`₱${fmt(invStats.value)}`} accent="#9b8ec4" />
                </>
              )}
            </div>

            {/* Mini summary tables */}
            <div className={styles.summaryGrid}>
              {activeTab === "Sales" ? (
                <>
                  {/* Top Selling Items */}
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryTitle}>Top Selling Items</div>
                    <table className={styles.miniTable}>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th className={styles.numCol}>Sales</th>
                          <th className={styles.numCol}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topSalesItems.length === 0 && (
                          <tr><td colSpan={3} className={styles.miniEmpty}>No sales yet</td></tr>
                        )}
                        {topSalesItems.map((item, i) => (
                          <tr key={item.name}>
                            <td><span className={styles.rankBadge}>{i + 1}</span>{item.name}</td>
                            <td className={styles.numCol}>{item.count}</td>
                            <td className={styles.numCol}>₱{fmt(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Top Buyers */}
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryTitle}>Top Buyers</div>
                    <table className={styles.miniTable}>
                      <thead>
                        <tr>
                          <th>Buyer</th>
                          <th className={styles.numCol}>Orders</th>
                          <th className={styles.numCol}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topSalesBuyers.length === 0 && (
                          <tr><td colSpan={3} className={styles.miniEmpty}>No buyers yet</td></tr>
                        )}
                        {topSalesBuyers.map((buyer, i) => (
                          <tr key={buyer.name}>
                            <td>
                              <div className={styles.buyerRow}>
                                <span className={styles.buyerAvatar}>{(buyer.name || "?")[0].toUpperCase()}</span>
                                <span className={styles.rankBadge}>{i + 1}</span>
                                {buyer.name}
                              </div>
                            </td>
                            <td className={styles.numCol}>{buyer.count}</td>
                            <td className={styles.numCol}>₱{fmt(buyer.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  {/* Low Stock Items */}
                  <div className={styles.summaryCard}>
                    <div className={styles.summaryTitle}>Low Stock Items</div>
                    <table className={styles.miniTable}>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th className={styles.numCol}>Qty</th>
                          <th className={styles.numCol}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStockItems.length === 0 && (
                          <tr><td colSpan={3} className={styles.miniEmpty}>No low stock items</td></tr>
                        )}
                        {lowStockItems.map(item => (
                          <tr key={item.id || item.name}>
                            <td>{item.name}</td>
                            <td className={styles.numCol}>{item.quantity ?? 0}</td>
                            <td className={styles.numCol}>
                              <span className={styles.statusBadge}
                                style={item.status === "Out of Stock"
                                  ? { background: "#fee2e2", color: "#991b1b" }
                                  : { background: "#fef3c7", color: "#92400e" }}>
                                {item.status === "Out of Stock" ? "Out" : "Low"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Top Suppliers — admin only */}
                  {isAdmin() && (
                    <div className={styles.summaryCard}>
                      <div className={styles.summaryTitle}>Top Suppliers</div>
                      <table className={styles.miniTable}>
                        <thead>
                          <tr>
                            <th>Supplier</th>
                            <th className={styles.numCol}>Items</th>
                            <th className={styles.numCol}>Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topSuppliers.length === 0 && (
                            <tr><td colSpan={3} className={styles.miniEmpty}>No suppliers yet</td></tr>
                          )}
                          {topSuppliers.map((s, i) => (
                            <tr key={s.supplier}>
                              <td><span className={styles.rankBadge}>{i + 1}</span>{s.supplier}</td>
                              <td className={styles.numCol}>{s.count}</td>
                              <td className={styles.numCol}>{s.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Activity Log Table ──────────────────────────────── */}
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <div className={styles.colUser}>User</div>
              <div className={styles.colAction}>Action</div>
              <div className={styles.colTarget}>
                {activeTab === "Sales" ? "Buyer / Item" : "Item"}
              </div>
              <div className={styles.colDetails}>Details</div>
              <div className={styles.colDate}>Date</div>
              <div className={styles.colTime}>Time</div>
            </div>

            <div className={styles.rows}>
              {pagedData.length === 0 && (
                <div className={styles.emptyMsg}>No activity records found.</div>
              )}
              {pagedData.map(log => {
                const color = ACTION_COLORS[log.actionType] || { bg: "#f3f4f6", color: "#374151" };
                return (
                  <div key={log.id} className={styles.row}>
                    <div className={styles.colUser}>
                      <div className={styles.userAvatar}>
                        {(log.username || "?")[0].toUpperCase()}
                      </div>
                      <span className={styles.userName}>{log.username || "—"}</span>
                    </div>
                    <div className={styles.colAction}>
                      <span
                        className={styles.actionBadge}
                        style={{ background: color.bg, color: color.color }}
                      >
                        {log.actionType || "—"}
                      </span>
                    </div>
                    <div className={styles.colTarget}>
                      {log.targetName || log.entityName || "—"}
                    </div>
                    <div className={styles.colDetails}>
                      {log.details || log.action || "—"}
                    </div>
                    <div className={styles.colDate}>{fmtDate(log.createdAt)}</div>
                    <div className={styles.colTime}>{fmtTime(log.createdAt)}</div>
                  </div>
                );
              })}
            </div>

            <div className={styles.pagination}>
              <span className={styles.pageInfo}>
                {filtered.length} record{filtered.length !== 1 ? "s" : ""}
              </span>
              <div className={styles.pagerBtns}>
                <button className={styles.pageBtn}
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  style={{ opacity: page === 0 ? 0.4 : 1, pointerEvents: page === 0 ? "none" : "auto" }}>‹</button>
                {pagerPages.map((p, idx) =>
                  p === "..." ? <span key={`d${idx}`} style={{ padding: "0 4px", color: "#999" }}>…</span>
                  : <button key={p} className={`${styles.pageBtn} ${p === page ? styles.activePage : ""}`}
                      onClick={() => setPage(p)}>{p + 1}</button>
                )}
                <button className={styles.pageBtn}
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  style={{ opacity: page >= totalPages - 1 ? 0.4 : 1, pointerEvents: page >= totalPages - 1 ? "none" : "auto" }}>›</button>
              </div>
            </div>
          </div>
        </section>

        {/* ══ Filter Panel ══════════════════════════════════════════ */}
        <aside className={styles.filterPanel}>
          <div className={styles.filterHeader}>
            <div className={styles.filterTitleWrap}>
              <span className={styles.filterIcon}>⚙</span>
              <span className={styles.filterTitle}>Filters</span>
            </div>
          </div>

          {/* Date Range */}
          <div className={styles.filterCard}>
            <div className={styles.cardTop}><span className={styles.cardTitle}>Date Range</span></div>
            <div className={styles.dateField}>
              <label className={styles.dateLabel}>From</label>
              <input type="date" className={styles.dateInput}
                value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} />
            </div>
            <div className={styles.dateField}>
              <label className={styles.dateLabel}>To</label>
              <input type="date" className={styles.dateInput}
                value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} />
            </div>
          </div>

          {/* Action Type */}
          <div className={styles.filterCard}>
            <div className={styles.cardTop}><span className={styles.cardTitle}>Action Type</span></div>
            <div className={styles.optionList}>
              {actionTypes.map(a => {
                const color = ACTION_COLORS[a] || { bg: "#f3f4f6", color: "#374151" };
                return (
                  <label key={a} className={styles.optionRow}>
                    <div className={styles.optionLeft}>
                      <input type="checkbox"
                        checked={actionFilter.includes(a)}
                        onChange={() => { toggleAction(a); setPage(0); }} />
                      <span className={styles.actionDot}
                        style={{ background: color.bg, color: color.color }}>
                        {a}
                      </span>
                    </div>
                    <span className={styles.optionCount}>
                      {rawLogs.filter(l => l.actionType === a).length}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <button className={styles.clearBtn} onClick={clearFilters}>Clear Filters</button>
        </aside>
      </div>
    </div>
  );
}
