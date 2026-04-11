import { useEffect, useMemo, useState } from "react";
import styles from "./ReportsPage.module.css";
import API from "../../config";
import { isAdmin } from "../../utils/permissions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getStores } from "../../utils/stores";
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

// Resolve the currently-selected store's display name from the same
// source the Topbar uses (utils/stores.js + localStorage). Falls back
// gracefully if nothing is set, so reports still generate for guests.
function currentStoreName() {
  try {
    const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
    const u = raw ? JSON.parse(raw) : null;
    const id = localStorage.getItem(`currentStore_${u?.id ?? "guest"}`);
    const stores = getStores();
    const match = stores.find(s => String(s.id) === String(id)) || stores[0];
    return match?.name || "";
  } catch {
    return "";
  }
}

function pdfHeader(doc, title, dateFrom, dateTo) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, pageW, 28, "F");

  // Store name across the top in small caps, title below it.
  const store = currentStoreName();
  doc.setTextColor(255, 255, 255);
  if (store) {
    doc.setFontSize(9); doc.setFont(undefined, "bold");
    doc.text(pdfSafe(store).toUpperCase(), 14, 9);
  }
  doc.setFontSize(16); doc.setFont(undefined, "bold");
  doc.text(pdfSafe(title), 14, 19);

  const dateRange = dateFrom || dateTo
    ? `${dateFrom || "-"}  to  ${dateTo || "-"}`
    : "All time";
  doc.setFontSize(9); doc.setFont(undefined, "normal");
  doc.text(dateRange, pageW - 14, 19, { align: "right" });

  doc.setTextColor(0, 0, 0);
  return 34; // y cursor after header (header grew from 22 → 28 tall)
}

function sectionTitle(doc, text, y) {
  doc.setFontSize(11); doc.setFont(undefined, "bold");
  doc.setTextColor(...GRAY);
  doc.text(text.toUpperCase(), 14, y);
  doc.setTextColor(0, 0, 0);
  return y + 5;
}

// Draws a one-line "Filters:" summary under the PDF header listing the
// non-default sidebar filters (action types, teams, payment terms,
// category, search). Date range already appears in the header itself.
// Returns the new y cursor.
function renderFilterSummary(doc, f, y) {
  if (!f) return y;
  const parts = [];
  if (f.search && f.search.trim())       parts.push(`Search: "${f.search.trim()}"`);
  if (f.actionFilter?.length)            parts.push(`Action: ${f.actionFilter.join(", ")}`);
  if (f.teamFilter?.length)              parts.push(`Team: ${f.teamFilter.join(", ")}`);
  if (f.termsFilter?.length)             parts.push(`Terms: ${f.termsFilter.join(", ")}`);
  if (f.categoryFilter?.length)          parts.push(`Category: ${f.categoryFilter.join(", ")}`);
  if (parts.length === 0) return y;

  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(...GRAY);
  const text = pdfSafe("Filters: " + parts.join("  -  "));
  const wrapped = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - 28);
  doc.text(wrapped, 14, y);
  doc.setTextColor(0, 0, 0);
  return y + wrapped.length * 4 + 4;
}

// jsPDF's default Helvetica is Latin-1 only. Any non-Latin-1 character
// (₱, em-dash, smart quotes, emoji) renders as a per-glyph escape that
// looks like "&P&a&y…" AND inflates the visual text length so it spills
// outside the cell. Replace the known offenders with plain ASCII and
// drop anything else > 0xFF.
function pdfSafe(s) {
  if (s == null) return "";
  return String(s)
    .replace(/₱/g, "P")
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x00-\xFF]/g, "");
}

// Renders the filtered activity-log rows as a new page in the PDF.
// Mirrors the on-screen table columns (User, Action, Buyer/Item,
// Details, Date, Time) so exported output matches what the user sees.
// Also repeats the active-filter summary at the top of this page so a
// recipient looking at "0 entries" immediately sees *why* — otherwise
// the empty table looks like a bug.
function renderActivityLogSection(doc, logs, title, dateFrom, dateTo, activeFilters) {
  doc.addPage();
  let y = pdfHeader(doc, title, dateFrom, dateTo);
  y = renderFilterSummary(doc, activeFilters, y);
  y = sectionTitle(doc, `${title} (${logs.length} ${logs.length === 1 ? "entry" : "entries"})`, y);

  const rows = logs.map(l => [
    pdfSafe(l.username || "—"),
    pdfSafe(l.actionType || "—"),
    pdfSafe(l.targetName || l.entityName || "—"),
    pdfSafe(l.details || l.action || "—"),
    l.createdAt ? fmtDate(l.createdAt) : "—",
    l.createdAt ? fmtTime(l.createdAt) : "—",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["User", "Action", "Buyer / Item", "Details", "Date", "Time"]],
    body: rows.length ? rows : [["", "", "No matching activity", "", "", ""]],
    headStyles: { fillColor: GOLD, textColor: 255, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 7, valign: "top" },
    styles: { overflow: "linebreak", cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 16 },
      2: { cellWidth: 40 },
      3: { cellWidth: "auto" },
      4: { cellWidth: 22 },
      5: { cellWidth: 16 },
    },
    margin: { left: 14, right: 14 },
    tableWidth: "auto",
  });
}

async function exportSalesPDF(salesStats, topItems, topBuyers, inventoryItems, dateFrom, dateTo, filteredLogs, activeFilters) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = pdfHeader(doc, "Sales Report", dateFrom, dateTo);
  y = renderFilterSummary(doc, activeFilters, y);

  // ── Summary stats (matches the on-screen cards + Total Profit) ─────
  y = sectionTitle(doc, "Summary", y);
  autoTable(doc, {
    startY: y,
    head: [["Total Sales", "Transactions", "Paid", "Remaining", "Total Profit"]],
    body: [[
      `P${fmt(salesStats.total)}`,
      salesStats.count,
      `P${fmt(salesStats.paid)}`,
      `P${fmt(salesStats.remaining)}`,
      `P${fmt(salesStats.profit)}`,
    ]],
    headStyles: { fillColor: GOLD, textColor: 255, fontStyle: "bold" },
    bodyStyles: { fillColor: LGOLD },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Top Selling Items (with image + profit per item) ──────────────
  // Resolve each item name to its inventory image URL (case-insensitive).
  const imgByName = {};
  (inventoryItems || []).forEach(inv => {
    if (inv?.name) imgByName[inv.name.trim().toLowerCase()] = inv.image || null;
  });
  const topImages = await Promise.all(
    topItems.map(it => loadImage(imgByName[(it.name || "").trim().toLowerCase()]))
  );

  const topItemRows = topItems.map((it, i) => [
    i + 1, "", it.name, it.count, `P${fmt(it.total)}`, `P${fmt(it.profit)}`,
  ]);
  y = sectionTitle(doc, "Top Selling Items", y);
  autoTable(doc, {
    startY: y,
    head: [["#", "Image", "Item", "Sales", "Total", "Profit"]],
    body: topItemRows.length ? topItemRows : [["", "", "No data", "", "", ""]],
    headStyles: { fillColor: GOLD, textColor: 255, fontStyle: "bold" },
    styles: { valign: "middle", minCellHeight: 16 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 20 },
      4: { cellWidth: 30 },
      5: { cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
    didDrawCell: data => {
      if (data.section !== "body" || data.column.index !== 1) return;
      const img = topImages[data.row.index];
      if (!img) return;
      const size = 14;
      const x = data.cell.x + (data.cell.width  - size) / 2;
      const cy = data.cell.y + (data.cell.height - size) / 2;
      try { doc.addImage(img, "JPEG", x, cy, size, size); } catch {}
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Top Buyers ─────────────────────────────────────────────────────
  const topBuyerRows = topBuyers.map((b, i) => [i + 1, b.name, b.count, `P${fmt(b.total)}`]);
  y = sectionTitle(doc, "Top Buyers", y);
  autoTable(doc, {
    startY: y,
    head: [["#", "Buyer", "Orders", "Total"]],
    body: topBuyerRows.length ? topBuyerRows : [["", "No data", "", ""]],
    headStyles: { fillColor: GOLD, textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 20 }, 3: { cellWidth: 35 } },
    margin: { left: 14, right: 14 },
  });

  // ── Filtered Activity Log ─────────────────────────────────────────
  // Everything the user sees in the on-screen table, with whichever
  // sidebar filters (action type, team, payment terms, date range,
  // search) they've applied. New page so it gets the full width.
  renderActivityLogSection(doc, filteredLogs || [], "Sales Activity Log", dateFrom, dateTo, activeFilters);

  doc.save("sales_report.pdf");
}

// Preload an image URL into an HTMLImageElement so jsPDF can embed it
// synchronously. Resolves to null on failure so the export doesn't crash.
function loadImage(url) {
  return new Promise(resolve => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function exportInventoryPDF(filteredItems, adminView, dateFrom, dateTo, filteredLogs, activeFilters) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = pdfHeader(doc, "Inventory Report", dateFrom, dateTo);
  y = renderFilterSummary(doc, activeFilters, y);

  // ── Summary stats (matches the on-screen cards + Total Profit) ─────
  const inStock  = filteredItems.filter(i => i.status === "In Stock").length;
  const lowStock = filteredItems.filter(i => (i.quantity || 0) <= 5 || i.status === "Out of Stock").length;
  const value    = filteredItems.reduce((s, i) => s + (i.sellingPrice || i.price || 0) * (i.quantity || 0), 0);
  const grams    = filteredItems.reduce((s, i) => s + (Number(i.grams) || 0) * (i.quantity || 0), 0);
  const cost     = filteredItems.reduce((s, i) => s + (Number(i.price) || 0) * (i.quantity || 0), 0);
  const profit   = filteredItems.reduce((s, i) => {
    const sp = Number(i.sellingPrice) || 0;
    const cp = Number(i.price) || 0;
    return s + Math.max(0, sp - cp) * (i.quantity || 0);
  }, 0);

  y = sectionTitle(doc, "Summary", y);
  autoTable(doc, {
    startY: y,
    head: [["Total Products", "Total Grams", "Total Cost", "Total Profit", "In Stock", "Low / Out", "Inventory Value"]],
    body: [[
      filteredItems.length,
      `${fmt(grams)}g`,
      `P${fmt(cost)}`,
      `P${fmt(profit)}`,
      inStock,
      lowStock,
      `P${fmt(value)}`,
    ]],
    headStyles: { fillColor: GOLD, textColor: 255, fontStyle: "bold", fontSize: 7 },
    bodyStyles: { fillColor: LGOLD, fontSize: 9 },
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

  // ── All Items (with image + profit per item) ──────────────────────
  doc.addPage();
  y = pdfHeader(doc, "Inventory Report — All Items", dateFrom, dateTo);
  y = sectionTitle(doc, "All Items", y);

  // Sort first, then preload images so the image index aligns with row index.
  const sortedItems = [...filteredItems].sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
  const images = await Promise.all(sortedItems.map(i => loadImage(i.image)));

  const cols = adminView
    ? ["Image", "Item", "Category", "Qty", "Cost", "Selling Price", "Profit", "Supplier", "Status"]
    : ["Image", "Item", "Category", "Qty", "Cost", "Selling Price", "Profit", "Status"];

  const itemProfit = i => {
    const sp = Number(i.sellingPrice) || 0;
    const cp = Number(i.price) || 0;
    return Math.max(0, sp - cp) * (i.quantity || 0);
  };

  const allRows = sortedItems.map(i => {
    const base = [
      "", // image cell — drawn in didDrawCell
      i.name || "—",
      i.category || "—",
      i.quantity ?? 0,
      `P${(i.price || 0).toLocaleString()}`,
      `P${(i.sellingPrice || 0).toLocaleString()}`,
      `P${fmt(itemProfit(i))}`,
    ];
    return adminView ? [...base, i.supplier || "—", i.status || "—"] : [...base, i.status || "—"];
  });

  autoTable(doc, {
    startY: y,
    head: [cols],
    body: allRows.length ? allRows : [Array(cols.length).fill("")],
    headStyles: { fillColor: GOLD, textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 8, valign: "middle", minCellHeight: 16 },
    columnStyles: { 0: { cellWidth: 18, halign: "center" } },
    margin: { left: 14, right: 14 },
    didDrawCell: data => {
      if (data.section !== "body" || data.column.index !== 0) return;
      const img = images[data.row.index];
      if (!img) return;
      const size = 14;
      const x = data.cell.x + (data.cell.width  - size) / 2;
      const cy = data.cell.y + (data.cell.height - size) / 2;
      try { doc.addImage(img, "JPEG", x, cy, size, size); } catch {}
    },
  });

  // ── Filtered Activity Log ─────────────────────────────────────────
  renderActivityLogSection(doc, filteredLogs || [], "Inventory Activity Log", dateFrom, dateTo, activeFilters);

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
  const [teamFilter, setTeamFilter]       = useState([]);
  const [termsFilter, setTermsFilter]     = useState([]);
  const [categoryFilter, setCategoryFilter] = useState([]);
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
  // Rows with a missing/unparseable date are kept in the result — otherwise
  // setting any date range silently drops them and the totals look broken.
  const filteredSales = useMemo(() => {
    if (!dateFrom && !dateTo) return sales;
    const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const to   = dateTo   ? new Date(dateTo   + "T23:59:59") : null;
    return sales.filter(l => {
      const d = parsePurchaseDate(l.purchaseDate);
      if (!d) return true;
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
      if (!i.createdAt) return true;
      const d = new Date(i.createdAt);
      if (isNaN(d)) return true;
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    });
  }, [inventoryItems, dateFrom, dateTo]);

  // Items used for the Inventory PDF export: date range (via
  // filteredInventoryItems) + the category and action-type filters shown in
  // the sidebar. Action type has no direct field on an inventory item, so
  // we narrow to items that appear as targets in the filtered inventory
  // activity logs.
  const exportInventoryItems = useMemo(() => {
    let items = filteredInventoryItems;
    if (categoryFilter.length > 0) {
      items = items.filter(i => categoryFilter.includes(i.category));
    }
    if (actionFilter.length > 0) {
      const allowedNames = new Set();
      inventoryLogs.forEach(l => {
        if (!actionFilter.includes(l.actionType)) return;
        if (dateFrom || dateTo) {
          const logDate = l.createdAt ? new Date(l.createdAt).toISOString().slice(0, 10) : null;
          if (dateFrom && logDate && logDate < dateFrom) return;
          if (dateTo   && logDate && logDate > dateTo)   return;
        }
        const name = (l.targetName || "").trim().toLowerCase();
        if (name) allowedNames.add(name);
      });
      items = items.filter(i => allowedNames.has((i.name || "").trim().toLowerCase()));
    }
    return items;
  }, [filteredInventoryItems, categoryFilter, actionFilter, inventoryLogs, dateFrom, dateTo]);

  // ── Sales activity logs filtered by date range only ───────────────
  // Used to drive the summary stats so the date picker actually controls
  // the numbers — and so the totals reflect activity history (Added/Paid
  // entries) rather than the current sales-table snapshot, which may have
  // been edited or deleted since.
  const dateFilteredSalesLogs = useMemo(() => {
    if (!dateFrom && !dateTo) return salesLogs;
    return salesLogs.filter(log => {
      if (!log.createdAt) return true;
      const logDate = new Date(log.createdAt).toISOString().slice(0, 10);
      if (dateFrom && logDate < dateFrom) return false;
      if (dateTo   && logDate > dateTo)   return false;
      return true;
    });
  }, [salesLogs, dateFrom, dateTo]);

  // Extract a peso amount that follows a specific label in the log details
  // string. Handles formats like "Total ₱19,500", "Payment ₱10.00", etc.
  const extractAmount = (text, label) => {
    if (!text) return 0;
    const re = new RegExp(label + "\\s*₱?\\s*([\\d,]+(?:\\.\\d+)?)", "i");
    const m  = text.match(re);
    if (!m) return 0;
    const n = parseFloat(m[1].replace(/,/g, ""));
    return isNaN(n) ? 0 : n;
  };

  // Split "Customer Name / Item Name" target into [customer, item]
  const splitTarget = (target) => {
    if (!target) return ["Unknown", "Unknown"];
    const idx = target.indexOf(" / ");
    if (idx < 0) return [target.trim(), "Unknown"];
    return [target.slice(0, idx).trim(), target.slice(idx + 3).trim()];
  };

  // Lookup inventory by item name (lowercased) for expected-profit math.
  const inventoryByName = useMemo(() => {
    const map = {};
    inventoryItems.forEach(i => {
      if (i?.name) map[i.name.trim().toLowerCase()] = i;
    });
    return map;
  }, [inventoryItems]);

  // Expected profit per sale = (selling price − cost) × qty sold,
  // looked up from the inventory item. This ignores any discount applied
  // on the sale, so the report shows the gross profit you would have
  // earned at list price. Falls back to the stored sale.profit when no
  // matching inventory item exists.
  const expectedProfit = (sale) => {
    const inv = inventoryByName[(sale.item || "").trim().toLowerCase()];
    if (inv) {
      const sp = Number(inv.sellingPrice) || 0;
      const cp = Number(inv.price) || 0;
      const qty = Number(sale.quantity) || 1;
      return Math.max(0, sp - cp) * qty;
    }
    return Number(sale.profit) || 0;
  };

  // ── Sales narrowed for the summary / top items / top buyers ─────
  // Honors date range + team + payment terms. Deliberately does NOT
  // apply the action-type filter — action types (Added/Edited/Paid
  // /Deleted) are a property of activity log entries, not of sales
  // records, so they only narrow the activity table below, not the
  // totals above. Same memo powers the on-screen cards and the PDF
  // export so the two always agree.
  const filteredSalesForStats = useMemo(() => {
    let rows = filteredSales;
    if (teamFilter.length > 0) {
      rows = rows.filter(s => s.team && teamFilter.includes(s.team));
    }
    if (termsFilter.length > 0) {
      rows = rows.filter(s => s.paymentTerms && termsFilter.includes(s.paymentTerms));
    }
    return rows;
  }, [filteredSales, teamFilter, termsFilter]);

  // ── Sales summary stats (derived directly from the sales records) ──
  const salesStats = useMemo(() => {
    let total = 0, paid = 0, remaining = 0, profit = 0;
    filteredSalesForStats.forEach(s => {
      const t = Number(s.totalPrice) || 0;
      const r = Number(s.remainingBalance) || 0;
      total     += t;
      remaining += r;
      paid      += Math.max(0, t - r);
      profit    += expectedProfit(s);
    });
    return { total, count: filteredSalesForStats.length, paid, remaining, profit };
  }, [filteredSalesForStats, inventoryByName]); // eslint-disable-line react-hooks/exhaustive-deps

  const topSalesItems = useMemo(() => {
    const map = {};
    filteredSalesForStats.forEach(s => {
      const name = (s.item || "Unknown").trim() || "Unknown";
      if (!map[name]) map[name] = { count: 0, total: 0, profit: 0 };
      map[name].count  += 1;
      map[name].total  += Number(s.totalPrice) || 0;
      map[name].profit += expectedProfit(s);
    });
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, data]) => ({ name, count: data.count, total: data.total, profit: data.profit }));
  }, [filteredSalesForStats, inventoryByName]); // eslint-disable-line react-hooks/exhaustive-deps

  const topSalesBuyers = useMemo(() => {
    const map = {};
    filteredSalesForStats.forEach(s => {
      const name = (s.customerName || "Unknown").trim() || "Unknown";
      if (!map[name]) map[name] = { count: 0, total: 0 };
      map[name].count += 1;
      map[name].total += Number(s.totalPrice) || 0;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, data]) => ({ name, count: data.count, total: data.total }));
  }, [filteredSalesForStats]);

  // ── Inventory summary stats ────────────────────────────────────────
  const invStats = useMemo(() => {
    const total    = filteredInventoryItems.length;
    const inStock  = filteredInventoryItems.filter(i => i.status === "In Stock").length;
    const lowStock = filteredInventoryItems.filter(i => (i.quantity || 0) <= 5 || i.status === "Out of Stock").length;
    const value    = filteredInventoryItems.reduce((s, i) => s + (i.sellingPrice || i.price || 0) * (i.quantity || 0), 0);
    const grams    = filteredInventoryItems.reduce((s, i) => s + (Number(i.grams) || 0) * (i.quantity || 0), 0);
    const cost     = filteredInventoryItems.reduce((s, i) => s + (Number(i.price) || 0) * (i.quantity || 0), 0);
    return { total, inStock, lowStock, value, grams, cost };
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
  // Lookup table: "customer / item" (lowercased) → SalesLoan, used to
  // filter sales activity logs by team / payment terms (those fields live
  // on the SalesLoan, not the activity log itself).
  const salesByTargetForFilter = useMemo(() => {
    const map = {};
    sales.forEach(s => {
      const key = `${(s.customerName || "").trim()} / ${(s.item || "").trim()}`.toLowerCase();
      if (!map[key]) map[key] = s;
    });
    return map;
  }, [sales]);

  // Lookup: inventory log targetName (lowercased) → category. Inventory
  // activity logs store the item name in `targetName`, so we resolve the
  // category from the live inventory list.
  const categoryByItemName = useMemo(() => {
    const map = {};
    inventoryItems.forEach(i => {
      if (i?.name) map[i.name.trim().toLowerCase()] = i.category || "";
    });
    return map;
  }, [inventoryItems]);

  // All categories that show up on the current inventory tab — used to
  // populate the filter sidebar. Sorted alphabetically.
  const inventoryCategories = useMemo(() => {
    const set = new Set();
    inventoryLogs.forEach(l => {
      const cat = categoryByItemName[(l.targetName || "").trim().toLowerCase()];
      if (cat) set.add(cat);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [inventoryLogs, categoryByItemName]);

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
      // Team / payment terms — prefer values stored directly on the log
      // (set at write time), fall back to the linked sale for legacy rows.
      if (teamFilter.length > 0 || termsFilter.length > 0) {
        const sale = salesByTargetForFilter[(log.targetName || "").trim().toLowerCase()];
        const logTeam  = log.team         || (sale && sale.team)         || null;
        const logTerms = log.paymentTerms || (sale && sale.paymentTerms) || null;
        if (teamFilter.length  > 0 && (!logTeam  || !teamFilter.includes(logTeam)))   return false;
        if (termsFilter.length > 0 && (!logTerms || !termsFilter.includes(logTerms))) return false;
      }
      // Inventory category — only meaningful for inventory logs.
      if (categoryFilter.length > 0) {
        const cat = categoryByItemName[(log.targetName || "").trim().toLowerCase()];
        if (!cat || !categoryFilter.includes(cat)) return false;
      }
      return true;
    });
  }, [rawLogs, search, actionFilter, dateFrom, dateTo, teamFilter, termsFilter, categoryFilter, salesByTargetForFilter, categoryByItemName]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedData  = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pagerPages = buildPagerPages(page, totalPages);

  const toggleAction = (a) =>
    setActionFilter(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);

  const toggleTeam = (t) =>
    setTeamFilter(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const toggleTerms = (t) =>
    setTermsFilter(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const toggleCategory = (c) =>
    setCategoryFilter(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);

  const clearFilters = () => {
    setSearch(""); setDateFrom(""); setDateTo("");
    setActionFilter([]); setTeamFilter([]); setTermsFilter([]); setCategoryFilter([]);
    setPage(0);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab); setPage(0);
    setActionFilter([]); setTeamFilter([]); setTermsFilter([]); setCategoryFilter([]);
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
                  const activeFilters = {
                    search, actionFilter, teamFilter, termsFilter, categoryFilter,
                  };
                  if (activeTab === "Sales") {
                    exportSalesPDF(
                      salesStats, topSalesItems, topSalesBuyers, inventoryItems,
                      dateFrom, dateTo, filtered, activeFilters,
                    );
                  } else {
                    exportInventoryPDF(
                      exportInventoryItems, isAdmin(),
                      dateFrom, dateTo, filtered, activeFilters,
                    );
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
                  <StatCard icon="📈" label="Total Profit" value={`₱${fmt(salesStats.profit)}`} accent="#8a7a4d" />
                </>
              ) : (
                <>
                  <StatCard icon="📦" label="Total Products" value={invStats.total} accent="#c9a84c" />
                  <StatCard icon="⚖" label="Total Grams" value={`${fmt(invStats.grams)}g`} accent="#b08968" />
                  <StatCard icon="🏷" label="Total Cost" value={`₱${fmt(invStats.cost)}`} accent="#8a7a4d" />
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

          {/* Team — only shown on Sales tab (inventory logs have no team) */}
          {activeTab === "Sales" && (
            <div className={styles.filterCard}>
              <div className={styles.cardTop}><span className={styles.cardTitle}>Team</span></div>
              <div className={styles.optionList}>
                {["Team A", "Team B", "Team C", "Team D", "Team E"].map(t => {
                  const count = rawLogs.filter(l => {
                    const sale = salesByTargetForFilter[(l.targetName || "").trim().toLowerCase()];
                    return (l.team || (sale && sale.team)) === t;
                  }).length;
                  return (
                    <label key={t} className={styles.optionRow}>
                      <div className={styles.optionLeft}>
                        <input type="checkbox"
                          checked={teamFilter.includes(t)}
                          onChange={() => { toggleTeam(t); setPage(0); }} />
                        <span className={styles.actionDot}
                          style={{ background: "#fef3c7", color: "#92400e" }}>
                          {t}
                        </span>
                      </div>
                      <span className={styles.optionCount}>{count}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment Terms — only shown on Sales tab */}
          {activeTab === "Sales" && (
            <div className={styles.filterCard}>
              <div className={styles.cardTop}><span className={styles.cardTitle}>Payment Terms</span></div>
              <div className={styles.optionList}>
                {["Cash", "Layaway"].map(t => {
                  const count = rawLogs.filter(l => {
                    const sale = salesByTargetForFilter[(l.targetName || "").trim().toLowerCase()];
                    return (l.paymentTerms || (sale && sale.paymentTerms)) === t;
                  }).length;
                  const color = t === "Cash"
                    ? { bg: "#dcfce7", color: "#166534" }
                    : { bg: "#dbeafe", color: "#1e40af" };
                  return (
                    <label key={t} className={styles.optionRow}>
                      <div className={styles.optionLeft}>
                        <input type="checkbox"
                          checked={termsFilter.includes(t)}
                          onChange={() => { toggleTerms(t); setPage(0); }} />
                        <span className={styles.actionDot}
                          style={{ background: color.bg, color: color.color }}>
                          {t}
                        </span>
                      </div>
                      <span className={styles.optionCount}>{count}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category — only shown on Inventory tab */}
          {activeTab === "Inventory" && (
            <div className={styles.filterCard}>
              <div className={styles.cardTop}><span className={styles.cardTitle}>Category</span></div>
              <div className={styles.optionList} style={{ maxHeight: 240, overflowY: "auto" }}>
                {inventoryCategories.length === 0 && (
                  <div style={{ padding: "8px 4px", color: "#999", fontSize: 12 }}>
                    No categories
                  </div>
                )}
                {inventoryCategories.map(c => {
                  const count = inventoryLogs.filter(l =>
                    categoryByItemName[(l.targetName || "").trim().toLowerCase()] === c
                  ).length;
                  return (
                    <label key={c} className={styles.optionRow}>
                      <div className={styles.optionLeft}>
                        <input type="checkbox"
                          checked={categoryFilter.includes(c)}
                          onChange={() => { toggleCategory(c); setPage(0); }} />
                        <span className={styles.actionDot}
                          style={{ background: "#e0e7ff", color: "#3730a3" }}>
                          {c}
                        </span>
                      </div>
                      <span className={styles.optionCount}>{count}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <button className={styles.clearBtn} onClick={clearFilters}>Clear Filters</button>
        </aside>
      </div>
    </div>
  );
}
