import { useEffect, useMemo, useState } from "react";
import styles from "./ReportsPage.module.css";
import API from "../../config";
import { isAdmin } from "../../utils/permissions";
import * as XLSX from "xlsx";
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

function makeSheet(rows, columns) {
  return XLSX.utils.json_to_sheet(
    rows.map(row =>
      Object.fromEntries(columns.map(({ key, label }) => [label, row[key] ?? ""]))
    )
  );
}

function exportSalesExcel(sales) {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — all transactions sorted highest to lowest
  const sorted = [...sales].sort((a, b) => (b.totalPrice || 0) - (a.totalPrice || 0));
  const txSheet = makeSheet(sorted, [
    { key: "customerName",     label: "Customer Name" },
    { key: "facebookName",     label: "Facebook Name" },
    { key: "mobileNumber",     label: "Mobile Number" },
    { key: "item",             label: "Item" },
    { key: "totalPrice",       label: "Total Price" },
    { key: "remainingBalance", label: "Remaining Balance" },
    { key: "monthsToPay",      label: "Months to Pay" },
    { key: "dueDate",          label: "Due Date" },
    { key: "purchaseDate",     label: "Purchase Date" },
    { key: "status",           label: "Status" },
  ]);
  XLSX.utils.book_append_sheet(wb, txSheet, "All Transactions");

  // Sheet 2 — items ranked highest to lowest by total sales amount
  const itemMap = {};
  sales.forEach(l => {
    const item = (l.item || "Unknown").trim();
    if (!itemMap[item]) itemMap[item] = { totalSales: 0, transactions: 0 };
    itemMap[item].totalSales   += (l.totalPrice || 0);
    itemMap[item].transactions += 1;
  });
  const ranked = Object.entries(itemMap)
    .sort((a, b) => b[1].totalSales - a[1].totalSales)
    .map(([item, d], i) => ({
      Rank: i + 1,
      Item: item,
      Transactions: d.transactions,
      "Total Sales (₱)": d.totalSales,
    }));
  const rankSheet = XLSX.utils.json_to_sheet(ranked);
  XLSX.utils.book_append_sheet(wb, rankSheet, "Items Ranking");

  XLSX.writeFile(wb, "sales_report.xlsx");
}

function exportInventoryExcel(inventoryItems, adminView) {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — all items sorted highest to lowest quantity
  const sorted = [...inventoryItems].sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
  const cols = [
    { key: "name",         label: "Item Name" },
    { key: "category",     label: "Category" },
    { key: "status",       label: "Status" },
    { key: "quantity",     label: "Quantity" },
    { key: "price",        label: "Cost Price" },
    { key: "sellingPrice", label: "Selling Price" },
    ...(adminView ? [{ key: "supplier", label: "Supplier" }] : []),
  ];
  XLSX.utils.book_append_sheet(wb, makeSheet(sorted, cols), "All Items");

  // Sheet 2 — items ranked highest to lowest by quantity
  const ranked = [...inventoryItems]
    .sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
    .map((item, i) => ({
      Rank: i + 1,
      "Item Name": item.name || "",
      Category: item.category || "",
      Status: item.status || "",
      Quantity: item.quantity ?? 0,
      "Selling Price (₱)": item.sellingPrice || item.price || 0,
      "Stock Value (₱)": (item.sellingPrice || item.price || 0) * (item.quantity || 0),
      ...(adminView ? { Supplier: item.supplier || "" } : {}),
    }));
  const rankSheet = XLSX.utils.json_to_sheet(ranked);
  XLSX.utils.book_append_sheet(wb, rankSheet, "Stock Ranking");

  XLSX.writeFile(wb, "inventory_report.xlsx");
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

  // ── Sales summary stats ────────────────────────────────────────────
  const salesStats = useMemo(() => {
    const total     = sales.reduce((s, l) => s + (l.totalPrice || 0), 0);
    const paid      = sales.reduce((s, l) => s + ((l.totalPrice || 0) - (l.remainingBalance || 0)), 0);
    const remaining = sales.reduce((s, l) => s + (l.remainingBalance || 0), 0);
    return { total, count: sales.length, paid, remaining };
  }, [sales]);

  const topSalesItems = useMemo(() => {
    const map = {};
    sales.forEach(l => {
      const item = (l.item || "Unknown").trim();
      if (!map[item]) map[item] = { count: 0, total: 0 };
      map[item].count += 1;
      map[item].total += (l.totalPrice || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, data]) => ({ name, count: data.count, total: data.total }));
  }, [sales]);

  const topSalesBuyers = useMemo(() => {
    const map = {};
    sales.forEach(l => {
      const buyer = (l.customerName || "Unknown").trim();
      if (!map[buyer]) map[buyer] = { count: 0, total: 0 };
      map[buyer].count += 1;
      map[buyer].total += (l.totalPrice || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, data]) => ({ name, count: data.count, total: data.total }));
  }, [sales]);

  // ── Inventory summary stats ────────────────────────────────────────
  const invStats = useMemo(() => {
    const total    = inventoryItems.length;
    const inStock  = inventoryItems.filter(i => i.status === "In Stock").length;
    const lowStock = inventoryItems.filter(i => (i.quantity || 0) <= 5 || i.status === "Out of Stock").length;
    const value    = inventoryItems.reduce((s, i) => s + (i.sellingPrice || i.price || 0) * (i.quantity || 0), 0);
    return { total, inStock, lowStock, value };
  }, [inventoryItems]);

  const lowStockItems = useMemo(() => {
    return inventoryItems
      .filter(i => (i.quantity || 0) <= 5 || i.status === "Out of Stock")
      .sort((a, b) => (a.quantity || 0) - (b.quantity || 0))
      .slice(0, 5);
  }, [inventoryItems]);

  const topSuppliers = useMemo(() => {
    const stats = {};
    inventoryItems.forEach(item => {
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
  }, [inventoryItems]);

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
                    exportSalesExcel(sales);
                  } else {
                    exportInventoryExcel(inventoryItems, isAdmin());
                  }
                }}
              >
                ⬇ Export Excel
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
