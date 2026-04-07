import { useEffect, useMemo, useState } from "react";
import styles from "./SalesPage.module.css";
import { canAddSales, canDeleteSales, canPaySales, isAdmin } from "../../utils/permissions";
import API_BASE from "../../config";

const PAGE_SIZE = 5;
const TABS = ["All", "Active", "Paid"];
const EMPTY_FORM = { customerName: "", facebookName: "", mobileNumber: "", item: "", quantity: "1", paymentTerms: "Cash", discount: "0", downPayment: "", monthsToPay: "1", dueDate: "" };


function buildPagerPages(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
  const last = totalPages - 1;
  if (page <= 3)        return [0, 1, 2, 3, 4, "...", last];
  if (page >= last - 3) return [0, "...", last-4, last-3, last-2, last-1, last];
  return                       [0, "...", page-1, page, page+1, "...", last];
}

// ─── SVG Icons ────────────────────────────────────────────────────
function IconLoans() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      <line x1="8" y1="14" x2="16" y2="14"/>
    </svg>
  );
}
function IconBarChart() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}
function IconCard() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  );
}
function IconDollar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  );
}
function IconSmallCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function IconTrend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  );
}

// ─── Auth helper ──────────────────────────────────────────────────
function getUser() {
  try { return JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "null"); }
  catch { return null; }
}
function authUsername() { return getUser()?.username || "system"; }

// ─── Date helpers ─────────────────────────────────────────────────
// "Mar 27, 2026" → "2026-03-27"  (for <input type="date">)
const MONTH_MAP = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
function toInputDate(str) {
  if (!str) return "";
  const m = str.match(/(\w+)\s+(\d+),\s+(\d{4})/);
  if (!m || MONTH_MAP[m[1]] === undefined) return "";
  return `${m[3]}-${String(MONTH_MAP[m[1]] + 1).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`;
}
// "2026-03-27" → "Mar 27, 2026"
function fromInputDate(str) {
  if (!str) return "";
  const [y, mo, d] = str.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}
// default due date = today + 30 days as "YYYY-MM-DD"
function defaultDueDateInput() {
  const d = new Date(); d.setDate(d.getDate() + 30);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ─── Page ─────────────────────────────────────────────────────────
export default function SalesPage() {
  const [loans, setLoans]                 = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [page, setPage]                   = useState(0);
  const [timeFilter, setTimeFilter]       = useState("Monthly");
  const [activeTab, setActiveTab]         = useState("All");
  const [showModal, setShowModal]         = useState(false);
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [submitting, setSubmitting]       = useState(false);
  const [payingId, setPayingId]           = useState(null);
  const [payModal, setPayModal]           = useState(null); // loan object when open
  const [payAmount, setPayAmount]         = useState("");
  const [payNotes, setPayNotes]           = useState("");
  const [historyModal, setHistoryModal]   = useState(null); // loan object when open
  const [sortCol, setSortCol]             = useState(null);   // "buyer" | "item" | null
  const [sortDir, setSortDir]             = useState("asc");  // "asc" | "desc"
  const [selectedItem, setSelectedItem]   = useState(null);
  const [lightboxImg, setLightboxImg]     = useState(null);
  const [editLoan, setEditLoan]           = useState(null);   // loan being edited
  const [editForm, setEditForm]           = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [apForm, setApForm]               = useState({ customerName: "", item: "", quantity: "1", paymentTerms: "Cash", discount: "0", downPayment: "", monthsToPay: "1", dueDate: "" });
  const [showItemPicker, setShowItemPicker] = useState(false);   // which form: "add" | "addProduct" | "edit"
  const [itemPickerSearch, setItemPickerSearch] = useState("");
  const [itemPickerCategory, setItemPickerCategory] = useState("All");
  const [itemPickerStatus, setItemPickerStatus] = useState("All");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const QUICK_ADD_EMPTY = { name: "", category: "", quantity: "", grams: "", supplier: "", price: "", sellingPrice: "" };
  const [quickAddForm, setQuickAddForm] = useState(QUICK_ADD_EMPTY);
  const [quickAddSubmitting, setQuickAddSubmitting] = useState(false);
  const [apSubmitting, setApSubmitting]   = useState(false);
  const [dueFilters, setDueFilters]       = useState([]);  // "Today" | "7 days" | "30 days" | "12 months"
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo]     = useState("");
  const [searchText, setSearchText]       = useState("");
  const [paymentStats, setPaymentStats]   = useState({ thisDay: 0, thisMonth: 0, thisYear: 0 });

  // ── Data fetching ──────────────────────────────────────────────
  const fetchLoans = () => {
    fetch(`${API_BASE}/api/sales`)
      .then((r) => r.json())
      .then((data) => setLoans(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error loading sales:", err));
  };

  const fetchPaymentStats = () => {
    fetch(`${API_BASE}/api/payments/stats`)
      .then(r => r.json()).then(d => setPaymentStats(d)).catch(() => {});
  };

  useEffect(() => {
    fetchLoans();
    fetchPaymentStats();
    fetch(`${API_BASE}/api/inventory`)
      .then((r) => r.json())
      .then((data) => setInventoryItems(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // ── Computed payment fields ────────────────────────────────────
  const calcQty         = Math.max(1, parseInt(form.quantity) || 1);
  const calcCost        = (selectedItem?.price        || 0) * calcQty;
  const calcSubTotal    = (selectedItem?.sellingPrice || 0) * calcQty;
  const calcDiscount    = Math.max(0, parseFloat(form.discount)    || 0);
  const calcDownPayment = Math.max(0, parseFloat(form.downPayment) || 0);
  const calcTotalPayable = Math.max(0, calcSubTotal - calcDiscount);
  const calcProfit       = calcTotalPayable - calcCost;
  const calcMonths       = parseInt(form.monthsToPay) || 1;
  const calcMonthly      = form.paymentTerms === "Cash"
    ? calcTotalPayable
    : calcMonths > 0 ? (calcTotalPayable - calcDownPayment) / calcMonths : 0;

  // ── Tab filtering ──────────────────────────────────────────────
  // Parse "Apr 26, 2026" → local-time Date (avoids UTC timezone shift bugs)
  const parseDate = (str) => {
    if (!str) return null;
    const MONTHS = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
    const m = str.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/);
    if (m) {
      const mo = MONTHS[m[1]];
      if (mo !== undefined) return new Date(+m[3], mo, +m[2]);
    }
    const d = new Date(str);
    return isNaN(d) ? null : d;
  };

  const filteredLoans = useMemo(() => {
    const now      = new Date(); now.setHours(0, 0, 0, 0);
    const weekEnd  = new Date(now); weekEnd.setDate(now.getDate() + 7);
    const monthEnd = new Date(now); monthEnd.setDate(now.getDate() + 30);

    let list = activeTab === "All" ? loans : loans.filter((l) => (l.status || "Active") === activeTab);

    // Search filter
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(l =>
        (l.customerName || "").toLowerCase().includes(q) ||
        (l.facebookName || "").toLowerCase().includes(q) ||
        (l.mobileNumber || "").toLowerCase().includes(q) ||
        (l.item         || "").toLowerCase().includes(q)
      );
    }

    // Payment Due checkboxes
    // "Today"      = due exactly today
    // "7 days"  = due within next 7 days (today → today+7)
    // "30 days" = due within next 30 days (today → today+30)
    // "12 months"  = due this calendar year
    if (dueFilters.length > 0) {
      list = list.filter(l => {
        const d = parseDate(l.dueDate);
        if (!d) return false;
        d.setHours(0, 0, 0, 0);
        return dueFilters.some(f => {
          if (f === "Today")      return d.getTime() === now.getTime();
          if (f === "7 days")  return d >= now && d <= weekEnd;
          if (f === "30 days") return d >= now && d <= monthEnd;
          if (f === "12 months")  return d.getFullYear() === now.getFullYear();
          return false;
        });
      });
    }

    // Created date filter
    // purchaseDate is stored as "MMM d, yyyy" (e.g. "Apr 5, 2026") — parse it reliably
    const parsePurchaseDate = str => {
      if (!str) return null;
      const MONTHS = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
      const m = str.match(/^(\w{3})\s+(\d{1,2}),\s+(\d{4})$/);
      if (m && MONTHS[m[1]] !== undefined)
        return new Date(parseInt(m[3]), MONTHS[m[1]], parseInt(m[2]));
      const fallback = new Date(str);
      return isNaN(fallback) ? null : fallback;
    };

    if (createdFrom || createdTo) {
      const from = createdFrom ? new Date(createdFrom + "T00:00:00") : null;
      const to   = createdTo   ? new Date(createdTo   + "T23:59:59") : null;
      list = list.filter(l => {
        const d = parsePurchaseDate(l.purchaseDate);
        if (!d) return false;
        if (from && d < from) return false;
        if (to   && d > to)   return false;
        return true;
      });
    }

    // Sort
    const dir = sortDir === "asc" ? 1 : -1;
    if      (sortCol === "buyer")   list = [...list].sort((a, b) => dir * (a.customerName || "").localeCompare(b.customerName || ""));
    else if (sortCol === "item")    list = [...list].sort((a, b) => dir * (a.item || "").localeCompare(b.item || ""));
    else if (sortCol === "dueDate") list = [...list].sort((a, b) => dir * ((a.dueDate || "") > (b.dueDate || "") ? 1 : -1));
    else if (sortCol)               list = [...list].sort((a, b) => dir * ((a[sortCol] || 0) - (b[sortCol] || 0)));
    else                            list = [...list].sort((a, b) => (b.id || 0) - (a.id || 0));
    return list;
  }, [loans, activeTab, sortCol, sortDir, searchText, dueFilters, createdFrom, createdTo]);

  // ── Due counts from all active loans ──────────────────────────
  const dueCounts = useMemo(() => {
    const now      = new Date(); now.setHours(0, 0, 0, 0);
    const weekEnd  = new Date(now); weekEnd.setDate(now.getDate() + 7);
    const monthEnd = new Date(now); monthEnd.setDate(now.getDate() + 30);
    const active   = loans.filter(l => (l.status || "Active") === "Active");
    const cnt = (fn) => active.filter(l => { const d = parseDate(l.dueDate); if (!d) return false; d.setHours(0,0,0,0); return fn(d); }).length;
    return {
      Today:        cnt(d => d.getTime() === now.getTime()),
      "7 days":  cnt(d => d >= now && d <= weekEnd),
      "30 days": cnt(d => d >= now && d <= monthEnd),
      "12 months":  cnt(d => d.getFullYear() === now.getFullYear()),
    };
  }, [loans]);

  // ── Summary stats (always from all loans) ─────────────────────
  const stats = useMemo(() => {
    const activeLoans = loans.filter((l) => (l.status || "Active") === "Active");
    return {
      activeLoans:        activeLoans.length,
      paidLoans:          loans.filter((l) => l.status === "Paid").length,
      salesTotal:         loans.reduce((s, l) => s + ((l.totalPrice || 0) - (l.remainingBalance || 0)), 0),
      outstandingBalance: loans.reduce((s, l) => s + (l.remainingBalance || 0), 0),
      monthlyPaymentsSum: activeLoans.reduce((s, l) => s + (l.monthlyPayment || 0), 0),
    };
  }, [loans]);

  const tabCounts = { All: loans.length, Active: stats.activeLoans, Paid: stats.paidLoans };

  const totalPages = Math.max(1, Math.ceil(filteredLoans.length / PAGE_SIZE));
  const pagedData  = filteredLoans.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pagerPages = buildPagerPages(page, totalPages);

  const fmt = (n) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
    setPage(0);
  };

  const sortIcon = (col) => {
    if (sortCol !== col) return <span className={styles.sortIcon}>⇅</span>;
    return <span className={styles.sortIcon}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  // ── Item picker helpers ────────────────────────────────────────
  const inventoryCategories = useMemo(() => {
    const cats = [...new Set(inventoryItems.map(i => i.category).filter(Boolean))].sort();
    return ["All", ...cats];
  }, [inventoryItems]);

  const filteredPickerItems = useMemo(() => {
    return inventoryItems.filter(inv => {
      if (inv.status === "Out of Stock" || inv.quantity <= 0) return false;
      const matchCat    = itemPickerCategory === "All" || inv.category === itemPickerCategory;
      const matchStatus = itemPickerStatus   === "All" || inv.status   === itemPickerStatus;
      const matchSearch = !itemPickerSearch.trim() ||
        (inv.name     || "").toLowerCase().includes(itemPickerSearch.toLowerCase()) ||
        (inv.category || "").toLowerCase().includes(itemPickerSearch.toLowerCase()) ||
        (inv.supplier || "").toLowerCase().includes(itemPickerSearch.toLowerCase());
      return matchCat && matchStatus && matchSearch;
    });
  }, [inventoryItems, itemPickerSearch, itemPickerCategory, itemPickerStatus]);

  const selectPickerItem = (inv) => {
    const autoPrice = String(inv.sellingPrice || inv.price || "");
    if (showItemPicker === "add") {
      setSelectedItem(inv);
      setForm(f => ({ ...f, item: inv.name, totalPrice: autoPrice || f.totalPrice }));
    } else if (showItemPicker === "addProduct") {
      setApForm(f => ({ ...f, item: inv.name, totalPrice: autoPrice || f.totalPrice }));
    } else if (showItemPicker === "edit") {
      setEditForm(f => ({ ...f, item: inv.name }));
    }
    setShowItemPicker(false);
  };

  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    setQuickAddSubmitting(true);
    const body = {
      name:         quickAddForm.name.trim(),
      category:     quickAddForm.category.trim(),
      status:       "Pre Order",
      quantity:     parseInt(quickAddForm.quantity) || 0,
      grams:        quickAddForm.grams !== "" ? parseFloat(quickAddForm.grams) : null,
      supplier:     quickAddForm.supplier.trim(),
      price:        parseFloat(quickAddForm.price) || 0,
      sellingPrice: parseFloat(quickAddForm.sellingPrice) || 0,
    };
    fetch(`${API_BASE}/api/inventory`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Username": authUsername() },
      body: JSON.stringify(body),
    })
      .then(r => r.json())
      .then(newItem => {
        setInventoryItems(prev => [...prev, newItem]);
        setQuickAddForm(QUICK_ADD_EMPTY);
        setShowQuickAdd(false);
        // Auto-select the newly added item
        selectPickerItem(newItem);
      })
      .catch(() => alert("Failed to add item. Please try again."))
      .finally(() => setQuickAddSubmitting(false));
  };

  // ── Map item name → inventory image ────────────────────────────
  const itemImageMap = useMemo(() => {
    const m = {};
    inventoryItems.forEach(i => { if (i.name) m[i.name] = i.image || null; });
    return m;
  }, [inventoryItems]);

  // ── Record a payment ───────────────────────────────────────────
  const openPayModal = (loan) => {
    setPayModal(loan);
    const thisMonth = Math.max(0, (loan.monthlyPayment || 0) - (loan.paidThisMonth || 0));
    setPayAmount(String(thisMonth > 0 ? thisMonth : (loan.monthlyPayment ?? "")));
    setPayNotes("");
  };

  const handlePaySubmit = (e) => {
    e.preventDefault();
    const loan = payModal;
    setPayingId(loan.id);
    fetch(`${API_BASE}/api/sales/${loan.id}/pay`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Username": authUsername() },
      body: JSON.stringify({ amount: parseFloat(payAmount) || 0, notes: payNotes.trim() }),
    })
      .then(r => r.json())
      .then(updated => {
        setLoans(prev => prev.map(l => l.id === updated.id ? updated : l));
        fetchPaymentStats();
        setPayModal(null);
      })
      .catch(err => console.error("Error recording payment:", err))
      .finally(() => setPayingId(null));
  };

  // ── Add new buyer ──────────────────────────────────────────────
  // Creates one sale record per unit (quantity × individual items)
  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);

    const dueDate = form.dueDate ? fromInputDate(form.dueDate) : fromInputDate(defaultDueDateInput());

    // Per-item values (discount is split evenly across all units)
    const perCost        = selectedItem?.price        || 0;
    const perSubTotal    = selectedItem?.sellingPrice || 0;
    const perDiscount    = calcQty > 0 ? calcDiscount / calcQty : 0;
    const perTotalPayable = Math.max(0, perSubTotal - perDiscount);
    const perProfit      = perTotalPayable - perCost;
    const perDownPayment = form.paymentTerms === "Layaway" && calcQty > 0 ? calcDownPayment / calcQty : 0;
    const perMonthly     = form.paymentTerms === "Cash"
      ? perTotalPayable
      : calcMonths > 0 ? (perTotalPayable - perDownPayment) / calcMonths : 0;
    const perRemaining   = form.paymentTerms === "Cash"
      ? perTotalPayable
      : perTotalPayable - perDownPayment;

    const singleBody = {
      customerName:     form.customerName,
      facebookName:     form.facebookName,
      mobileNumber:     form.mobileNumber,
      item:             form.item,
      quantity:         1,
      paymentTerms:     form.paymentTerms,
      subTotal:         perSubTotal,
      discount:         parseFloat(perDiscount.toFixed(2)),
      downPayment:      parseFloat(perDownPayment.toFixed(2)),
      totalPrice:       parseFloat(perTotalPayable.toFixed(2)),
      monthsToPay:      form.paymentTerms === "Cash" ? 1 : calcMonths,
      monthlyPayment:   parseFloat(perMonthly.toFixed(2)),
      remainingBalance: parseFloat(perRemaining.toFixed(2)),
      profit:           parseFloat(perProfit.toFixed(2)),
      dueDate,
      status: "Active",
    };

    // Fire one POST per unit in parallel
    Promise.all(
      Array.from({ length: calcQty }, () =>
        fetch(`${API_BASE}/api/sales`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Username": authUsername() },
          body: JSON.stringify(singleBody),
        }).then(r => r.json())
      )
    )
      .then(newLoans => {
        setLoans(prev => [...prev, ...newLoans]);
        setShowModal(false);
        setForm(EMPTY_FORM);
        setSelectedItem(null);
      })
      .catch(err => console.error("Error adding buyers:", err))
      .finally(() => setSubmitting(false));
  };

  const closeModal = () => { setShowModal(false); setForm(EMPTY_FORM); setSelectedItem(null); };

  // ── Unique customers from existing loans ───────────────────────
  const uniqueCustomers = useMemo(() => {
    const seen = new Map();
    loans.forEach(l => {
      if (l.customerName && !seen.has(l.customerName)) {
        seen.set(l.customerName, { customerName: l.customerName, facebookName: l.facebookName || "", mobileNumber: l.mobileNumber || "" });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.customerName.localeCompare(b.customerName));
  }, [loans]);

  // ── Add Product (existing customer, new item) ──────────────────
  const apSelectedItem = useMemo(() =>
    inventoryItems.find(i => i.name === apForm.item) || null,
  [inventoryItems, apForm.item]);

  const apQty         = Math.max(1, parseInt(apForm.quantity) || 1);
  const apCost        = (apSelectedItem?.price        || 0) * apQty;
  const apSubTotal    = (apSelectedItem?.sellingPrice || 0) * apQty;
  const apDiscount    = Math.max(0, parseFloat(apForm.discount)    || 0);
  const apDownPayment = Math.max(0, parseFloat(apForm.downPayment) || 0);
  const apTotalPayable = Math.max(0, apSubTotal - apDiscount);
  const apProfit       = apTotalPayable - apCost;
  const apMonths       = parseInt(apForm.monthsToPay) || 1;
  const apMonthly      = apForm.paymentTerms === "Cash"
    ? apTotalPayable
    : apMonths > 0 ? (apTotalPayable - apDownPayment) / apMonths : 0;

  const closeAddProduct = () => {
    setShowAddProduct(false);
    setApForm({ customerName: "", item: "", quantity: "1", paymentTerms: "Cash", discount: "0", downPayment: "", monthsToPay: "1", dueDate: "" });
  };

  const handleApSubmit = (e) => {
    e.preventDefault();
    setApSubmitting(true);
    const dueDate = apForm.dueDate ? fromInputDate(apForm.dueDate) : fromInputDate(defaultDueDateInput());
    const customer = uniqueCustomers.find(c => c.customerName === apForm.customerName) || {};

    const perCost         = apSelectedItem?.price        || 0;
    const perSubTotal     = apSelectedItem?.sellingPrice || 0;
    const perDiscount     = apQty > 0 ? apDiscount / apQty : 0;
    const perTotalPayable = Math.max(0, perSubTotal - perDiscount);
    const perProfit       = perTotalPayable - perCost;
    const perDownPayment  = apForm.paymentTerms === "Layaway" && apQty > 0 ? apDownPayment / apQty : 0;
    const perMonthly      = apForm.paymentTerms === "Cash"
      ? perTotalPayable
      : apMonths > 0 ? (perTotalPayable - perDownPayment) / apMonths : 0;
    const perRemaining    = apForm.paymentTerms === "Cash" ? perTotalPayable : perTotalPayable - perDownPayment;

    const singleBody = {
      customerName:     apForm.customerName,
      facebookName:     customer.facebookName || "",
      mobileNumber:     customer.mobileNumber || "",
      item:             apForm.item,
      quantity:         1,
      paymentTerms:     apForm.paymentTerms,
      subTotal:         perSubTotal,
      discount:         parseFloat(perDiscount.toFixed(2)),
      downPayment:      parseFloat(perDownPayment.toFixed(2)),
      totalPrice:       parseFloat(perTotalPayable.toFixed(2)),
      monthsToPay:      apForm.paymentTerms === "Cash" ? 1 : apMonths,
      monthlyPayment:   parseFloat(perMonthly.toFixed(2)),
      remainingBalance: parseFloat(perRemaining.toFixed(2)),
      profit:           parseFloat(perProfit.toFixed(2)),
      dueDate,
      status: "Active",
    };

    Promise.all(
      Array.from({ length: apQty }, () =>
        fetch(`${API_BASE}/api/sales`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Username": authUsername() },
          body: JSON.stringify(singleBody),
        }).then(r => r.json())
      )
    )
      .then(newLoans => { setLoans(prev => [...prev, ...newLoans]); closeAddProduct(); })
      .catch(err => console.error("Error adding product:", err))
      .finally(() => setApSubmitting(false));
  };

  // ── Open edit modal ────────────────────────────────────────────
  const openEdit = (loan) => {
    setEditLoan(loan);
    setEditForm({
      customerName:     loan.customerName     || "",
      facebookName:     loan.facebookName     || "",
      mobileNumber:     loan.mobileNumber     || "",
      item:             loan.item             || "",
      paymentTerms:     loan.paymentTerms     || "Cash",
      discount:         String(loan.discount      ?? "0"),
      downPayment:      String(loan.downPayment   ?? "0"),
      monthsToPay:      String(loan.monthsToPay   ?? "1"),
      totalPrice:       String(loan.totalPrice    ?? ""),
      monthlyPayment:   String(loan.monthlyPayment ?? ""),
      remainingBalance: String(loan.remainingBalance ?? ""),
      subTotal:         String(loan.subTotal        ?? ""),
      profit:           String(loan.profit         ?? ""),
      dueDate:          loan.dueDate          || "",
      status:           loan.status           || "Active",
    });
  };

  const closeEdit = () => { setEditLoan(null); setEditForm({}); };

  // Computed vars for Edit Buyer modal (derived, not stored in editForm)
  const editSelectedItem  = useMemo(() => inventoryItems.find(i => i.name === editForm.item) || null, [inventoryItems, editForm.item]);
  const editCost          = editSelectedItem?.price || 0;
  // Use manually entered subTotal if set, otherwise fall back to item's sellingPrice
  const editSubTotal      = parseFloat(editForm.subTotal) || editSelectedItem?.sellingPrice || 0;
  const editDiscount      = Math.max(0, parseFloat(editForm.discount)    || 0);
  const editDownPayment   = Math.max(0, parseFloat(editForm.downPayment) || 0);
  const editTotalPayable  = Math.max(0, editSubTotal - editDiscount);
  const editProfit        = editTotalPayable - editCost;
  const editMonths        = parseInt(editForm.monthsToPay) || 1;
  const editMonthly       = editForm.paymentTerms === "Cash"
    ? (parseFloat(editForm.remainingBalance) || editTotalPayable)
    : editMonths > 0 ? (editTotalPayable - editDownPayment) / editMonths : 0;

  const handleDelete = (loan) => {
    if (!window.confirm(`Delete sale record for "${loan.customerName} — ${loan.item}"?\nThis cannot be undone.`)) return;
    fetch(`${API_BASE}/api/sales/${loan.id}`, {
      method: "DELETE",
      headers: { "X-Username": authUsername() },
    })
      .then(() => setLoans(prev => prev.filter(l => l.id !== loan.id)))
      .catch(err => console.error("Error deleting loan:", err));
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    const body = {
      ...editForm,
      totalPrice:       parseFloat(editTotalPayable.toFixed(2)),
      monthsToPay:      editForm.paymentTerms === "Cash" ? 1 : editMonths,
      monthlyPayment:   parseFloat(editMonthly.toFixed(2)),
      remainingBalance: parseFloat(editForm.remainingBalance),
      discount:         editDiscount,
      downPayment:      editDownPayment,
      profit:           parseFloat(editProfit.toFixed(2)),
      subTotal:         parseFloat(editSubTotal.toFixed(2)),
    };
    fetch(`${API_BASE}/api/sales/${editLoan.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Username": authUsername() },
      body: JSON.stringify(body),
    })
      .then(r => r.json())
      .then(updated => {
        setLoans(prev => prev.map(l => l.id === updated.id ? updated : l));
        closeEdit();
      })
      .catch(err => console.error("Error updating loan:", err))
      .finally(() => setEditSubmitting(false));
  };;

  const field = (key, label, type = "text", required = false) => (
    <div className={styles.formField}>
      <label className={styles.formLabel}>{label}{required && <span className={styles.req}> *</span>}</label>
      <input
        type={type}
        className={styles.formInput}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        required={required}
      />
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>

        {/* ══ Main Card ══════════════════════════════════════════════ */}
        <section className={styles.mainCard}>

          {/* Header */}
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Sales</h1>
            {/* <div className={styles.timeToggle}>
              <button className={`${styles.toggleBtn} ${timeFilter === "Monthly"  ? styles.activeToggle : ""}`} onClick={() => setTimeFilter("Monthly")}>Monthly</button>
              <button className={`${styles.toggleBtn} ${timeFilter === "All Time" ? styles.activeToggle : ""}`} onClick={() => setTimeFilter("All Time")}>All Time <span className={styles.chevron}>▾</span></button>
            </div> */}
          </div>

          {/* 4 Stat Cards */}
          <div className={styles.statCards}>
            <div className={styles.statCard}>
              <div className={`${styles.statIconWrap} ${styles.iconGold}`}><IconLoans /></div>
              <div className={styles.statValue}>{stats.activeLoans}</div>
              <div className={styles.statLabel}>Active Loans</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statIconWrap} ${styles.iconGold}`}><IconCalendar /></div>
              <div className={styles.statValue}>{stats.activeLoans} <span className={styles.statValueSub}>/ {loans.length}</span></div>
              <div className={styles.statLabel}>Monthly Payments Ongoing</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statIconWrap} ${styles.iconGreen}`}><IconBarChart /></div>
              <div className={styles.statValue}>₱{fmt(stats.salesTotal)}</div>
              <div className={styles.statLabel}>Sales Total</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statIconWrap} ${styles.iconRed}`}><IconCard /></div>
              <div className={styles.statValue}>₱{fmt(stats.outstandingBalance)}</div>
              <div className={styles.statLabel}>Outstanding Balance</div>
            </div>
          </div>

          {/* Ongoing Loans header */}
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Ongoing Loans</h2>
            <div className={styles.sectionActions}>
              <div className={styles.miniPager}>
                {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
                  <button key={i} className={`${styles.miniPageBtn} ${page === i ? styles.miniPageActive : ""}`} onClick={() => setPage(i)}>{i + 1}</button>
                ))}
              </div>
              <button className={styles.allTimeBtn}>All Time <span className={styles.chevron}>▾</span></button>
            </div>
          </div>

          {/* Sub-stats */}
          <div className={styles.subStats}>
            <div className={styles.subStat}>
              <div className={`${styles.subIcon} ${styles.subIconGreen}`}><IconDollar /></div>
              <div><div className={styles.subValue}>₱{fmt(stats.monthlyPaymentsSum)}</div><div className={styles.subLabel}>Total Monthly Payments</div></div>
            </div>
            <div className={styles.subStat}>
              <div className={`${styles.subIcon} ${styles.subIconGold}`}><IconSmallCalendar /></div>
              <div><div className={styles.subValue}>₱{fmt(stats.salesTotal)}</div><div className={styles.subLabel}>In Sales This Month</div></div>
            </div>
            <div className={styles.subStat}>
              <div className={`${styles.subIcon} ${styles.subIconGold}`}><IconSmallCalendar /></div>
              <div><div className={styles.subValue}>₱{fmt(stats.outstandingBalance)}</div><div className={styles.subLabel}>Outstanding This Month</div></div>
            </div>
            <div className={styles.subStat}>
              <div className={`${styles.subIcon} ${styles.subIconGold}`}><IconTrend /></div>
              <div><div className={styles.subValue}>{loans.length}</div><div className={styles.subLabel}>Total Buyers</div></div>
            </div>
          </div>

          {/* Table */}
          <div className={styles.tableCard}>

            {/* Tabs + Add Buyer */}
            <div className={styles.tableTabs}>
              <div className={styles.tabsLeft}>
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    className={`${styles.tableTab} ${activeTab === tab ? styles.activeTableTab : ""}`}
                    onClick={() => { setActiveTab(tab); setPage(0); }}
                  >
                    {tab}
                    <span className={`${styles.tabBadge} ${tab === "Active" ? styles.badgeGold : tab === "Paid" ? styles.badgeGreen : styles.badgeGray}`}>
                      {tabCounts[tab]}
                    </span>
                  </button>
                ))}
              </div>
              <div className={styles.headerBtns}>
                {canAddSales() && <button className={styles.addProductBtn} onClick={() => setShowAddProduct(true)}>+ Add Product</button>}
                {canAddSales() && <button className={styles.addBuyerBtn}   onClick={() => setShowModal(true)}>+ Add Buyer</button>}
              </div>
            </div>

            <div className={styles.tableHeader}>
              <div className={`${styles.colBuyer} ${styles.sortableCol}`} onClick={() => handleSort("buyer")}>Buyer {sortIcon("buyer")}</div>
              <div className={`${styles.colItem} ${styles.sortableCol}`} onClick={() => handleSort("item")}>Item {sortIcon("item")}</div>
              <div className={`${styles.colTotal} ${styles.sortableCol}`} onClick={() => handleSort("totalPrice")}>Total Price {sortIcon("totalPrice")}</div>
              <div className={`${styles.colMonthly} ${styles.sortableCol}`} onClick={() => handleSort("monthlyPayment")}>Monthly {sortIcon("monthlyPayment")}</div>
              <div className={styles.colPayableMonth}>This Month</div>
              <div className={`${styles.colBalance} ${styles.sortableCol}`} onClick={() => handleSort("remainingBalance")}>Remaining {sortIcon("remainingBalance")}</div>
              <div className={`${styles.colDue} ${styles.sortableCol}`} onClick={() => handleSort("dueDate")}>Due Date {sortIcon("dueDate")}</div>
              <div className={styles.colAction}></div>
            </div>

            <div className={styles.rows}>
              {pagedData.length === 0 && (
                <div className={styles.emptyMsg}>No {activeTab !== "All" ? activeTab.toLowerCase() : ""} loans found.</div>
              )}
              {pagedData.map((loan) => {
                const isPaid = loan.status === "Paid";
                return (
                  <div key={loan.id} className={`${styles.row} ${isPaid ? styles.rowPaid : ""}`}>
                    <div className={styles.colBuyer}>
                      <div className={styles.buyerName}>{loan.customerName}</div>
                      {loan.facebookName && <div className={styles.buyerFb}>fb: {loan.facebookName}</div>}
                      {loan.mobileNumber && <div className={styles.buyerMobile}>📱 {loan.mobileNumber}</div>}
                    </div>
                    <div className={styles.colItem}>
                      {itemImageMap[loan.item] && (
                        <img
                          src={itemImageMap[loan.item]}
                          alt={loan.item}
                          className={styles.rowItemImg}
                          onClick={() => setLightboxImg(itemImageMap[loan.item])}
                          title="Click to enlarge"
                        />
                      )}
                      <strong>{loan.item}</strong>
                    </div>
                    <div className={styles.colTotal}>₱{(loan.totalPrice || 0).toLocaleString()}</div>
                    <div className={styles.colMonthly}>₱{(loan.monthlyPayment || 0).toLocaleString()}</div>
                    <div className={styles.colPayableMonth}>
                      {loan.status === "Paid" || loan.paymentTerms === "Cash"
                        ? "—"
                        : (() => {
                            const due = Math.max(0, (loan.monthlyPayment || 0) - (loan.paidThisMonth || 0));
                            return due === 0
                              ? <span className={styles.paidThisMonth}>✓ Paid</span>
                              : <span className={due < (loan.monthlyPayment || 0) ? styles.partialThisMonth : ""}>₱{due.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
                          })()
                      }
                    </div>
                    <div className={styles.colBalance}>₱{(loan.remainingBalance || 0).toLocaleString()}</div>
                    <div className={styles.colDue}>{loan.dueDate}</div>
                    <div className={styles.colAction}>
                      <button className={styles.infoBtn} onClick={() => setHistoryModal(loan)} title="View History">ℹ</button>
                      {isAdmin()        && <button className={styles.editBtn}   onClick={() => openEdit(loan)}    title="Edit">✎</button>}
                      {canDeleteSales() && <button className={styles.deleteBtn} onClick={() => handleDelete(loan)} title="Delete">🗑</button>}
                      {isPaid ? (
                        <span className={styles.paidBadge}>✓ Paid</span>
                      ) : canPaySales() ? (
                        <button
                          className={styles.payBtn}
                          onClick={() => openPayModal(loan)}
                          disabled={payingId === loan.id}
                        >
                          {payingId === loan.id ? "..." : "Pay"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.pagination}>
              <button className={styles.pageBtn} onClick={() => setPage((p) => Math.max(0, p - 1))} style={{ opacity: page === 0 ? 0.4 : 1, pointerEvents: page === 0 ? "none" : "auto" }}>‹</button>
              {pagerPages.map((p, idx) =>
                p === "..." ? (
                  <span key={`dots-${idx}`} style={{ padding: "0 4px", color: "#999" }}>…</span>
                ) : (
                  <button key={p} className={`${styles.pageBtn} ${p === page ? styles.activePage : ""}`} onClick={() => setPage(p)}>{p + 1}</button>
                )
              )}
              <button className={styles.pageBtn} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} style={{ opacity: page >= totalPages - 1 ? 0.4 : 1, pointerEvents: page >= totalPages - 1 ? "none" : "auto" }}>›</button>
            </div>
          </div>

        </section>

        {/* ══ Filter Panel ═══════════════════════════════════════════ */}
        <aside className={styles.filterPanel}>
          <div className={styles.filterHeader}>
            <div className={styles.filterTitleWrap}>
              <span className={styles.filterIcon}>⚙</span>
              <span className={styles.filterTitle}>Filters</span>
            </div>
          </div>
          <div className={`${styles.summaryStrip} ${styles.stripGreen}`}>
            <span>This Day Sale</span>
            <span className={styles.stripValue}>₱{fmt(paymentStats.thisDay)}</span>
          </div>
          <div className={`${styles.summaryStrip} ${styles.stripOlive}`}>
            <span>This Month Sale</span>
            <span className={styles.stripValue}>₱{fmt(paymentStats.thisMonth)}</span>
          </div>
          <div className={`${styles.summaryStrip} ${styles.stripGold}`}>
            <span>This Year Sale</span>
            <span className={styles.stripValue}>₱{fmt(paymentStats.thisYear)}</span>
          </div>
          <div className={styles.filterCard}>
            <div className={styles.cardTop}><span className={styles.cardTitle}>Search</span></div>
            <div className={styles.searchBox}>
              <span className={styles.searchIcon}>⌕</span>
              <input type="text" placeholder="Name, item, mobile..." className={styles.searchInput}
                value={searchText} onChange={e => { setSearchText(e.target.value); setPage(0); }} />
            </div>
          </div>
          <div className={styles.filterCard}>
            <div className={styles.cardTop}><span className={styles.cardTitle}>Payment Due</span></div>
            <div className={styles.optionList}>
              {["Today", "7 days", "30 days", "12 months"].map(label => (
                <label key={label} className={styles.optionRow}>
                  <div className={styles.optionLeft}>
                    <input type="checkbox"
                      checked={dueFilters.includes(label)}
                      onChange={() => {
                        setDueFilters(prev => prev.includes(label) ? prev.filter(f => f !== label) : [...prev, label]);
                        setPage(0);
                      }} />
                    <span>{label} <span className={styles.dueCount}>({dueCounts[label] ?? 0})</span></span>
                  </div>
                  <span className={styles.chevronRight}>›</span>
                </label>
              ))}
            </div>
          </div>
          <div className={styles.filterCard}>
            <div className={styles.cardTop}><span className={styles.cardTitle}>Created Date</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#6b6763" }}>From</span>
                <input type="date" className={styles.searchInput}
                  style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: "6px 10px", width: "100%", boxSizing: "border-box" }}
                  value={createdFrom}
                  onChange={e => { setCreatedFrom(e.target.value); setPage(0); }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#6b6763" }}>To</span>
                <input type="date" className={styles.searchInput}
                  style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: "6px 10px", width: "100%", boxSizing: "border-box" }}
                  value={createdTo}
                  onChange={e => { setCreatedTo(e.target.value); setPage(0); }} />
              </div>
            </div>
          </div>
          <button className={styles.applyBtn}
            onClick={() => { setDueFilters([]); setCreatedFrom(""); setCreatedTo(""); setSearchText(""); setPage(0); }}>
            Clear Filters
          </button>
        </aside>

      </div>

      {/* ══ Item Picker Popup ════════════════════════════════════ */}
      {showItemPicker && (
        <div className={styles.itemPickerOverlay} onClick={() => setShowItemPicker(false)}>
          <div className={styles.itemPickerCard} onClick={e => e.stopPropagation()}>
            <div className={styles.itemPickerHeader}>
              <h3 className={styles.itemPickerTitle}>Choose Product</h3>
              <button className={styles.itemPickerClose} onClick={() => setShowItemPicker(false)}>✕</button>
            </div>
            <div className={styles.itemPickerControls}>
              <input
                className={styles.itemPickerSearch}
                placeholder="Search by name, category, supplier..."
                value={itemPickerSearch}
                onChange={e => setItemPickerSearch(e.target.value)}
                autoFocus
              />
              <div style={{ display:"flex", gap:"8px" }}>
                <select className={styles.itemPickerFilter} style={{ flex:1 }} value={itemPickerCategory}
                  onChange={e => setItemPickerCategory(e.target.value)}>
                  {inventoryCategories.map(cat => (
                    <option key={cat} value={cat}>{cat === "All" ? "All Categories" : cat}</option>
                  ))}
                </select>
                <select className={styles.itemPickerFilter} style={{ flex:1 }} value={itemPickerStatus}
                  onChange={e => setItemPickerStatus(e.target.value)}>
                  <option value="All">All Status</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Pre Order">Pre Order</option>
                </select>
              </div>
              <button type="button" className={styles.quickAddBtn}
                onClick={() => { setQuickAddForm(QUICK_ADD_EMPTY); setShowQuickAdd(true); }}>
                ＋ Quick Add Product
              </button>
            </div>
            <div className={styles.itemPickerList}>
              {filteredPickerItems.length === 0 && (
                <div className={styles.itemPickerEmpty}>No items found.</div>
              )}
              {filteredPickerItems.map(inv => (
                <div key={inv.id} className={styles.itemPickerItem} onClick={() => selectPickerItem(inv)}>
                  {inv.image
                    ? <img src={inv.image} alt={inv.name} className={styles.itemPickerImg} />
                    : <div className={styles.itemPickerImgPlaceholder}>📦</div>
                  }
                  <div className={styles.itemPickerInfo}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px" }}>
                      <span className={styles.itemPickerName} style={{ marginBottom:0 }}>{inv.name}</span>
                      <span style={{
                        fontSize:"11px", fontWeight:600, padding:"2px 8px", borderRadius:"20px",
                        background: inv.status === "In Stock" ? "#e2b22f" : "#c9c7c7",
                        color: inv.status === "In Stock" ? "#fff" : "#555",
                        whiteSpace:"nowrap"
                      }}>{inv.status}</span>
                    </div>
                    <div className={styles.itemPickerMeta}>
                      {inv.category && <span>{inv.category}</span>}
                      {inv.supplier && <span>Supplier: {inv.supplier}</span>}
                      {inv.grams != null && <span>{inv.grams}g / pc</span>}
                      <span className={styles.itemPickerCost}>Cost: {(inv.price || 0).toLocaleString()}</span>
                      <span className={styles.itemPickerSell}>Sell: {(inv.sellingPrice || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <span className={styles.itemPickerQtyBadge}>{inv.quantity ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ Quick Add Product Modal ══════════════════════════════ */}
      {showQuickAdd && (
        <div className={styles.quickAddOverlay} onClick={() => setShowQuickAdd(false)}>
          <div className={styles.quickAddCard} onClick={e => e.stopPropagation()}>
            <div className={styles.itemPickerHeader}>
              <h3 className={styles.itemPickerTitle}>Quick Add Product</h3>
              <button className={styles.itemPickerClose} onClick={() => setShowQuickAdd(false)}>✕</button>
            </div>
            <form onSubmit={handleQuickAddSubmit}>
              <div className={styles.quickAddGrid}>
                <div className={styles.quickAddField} style={{ gridColumn: "1 / -1" }}>
                  <label className={styles.quickAddLabel}>Item Name <span className={styles.req}>*</span></label>
                  <input className={styles.quickAddInput} required value={quickAddForm.name}
                    onChange={e => setQuickAddForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className={styles.quickAddField}>
                  <label className={styles.quickAddLabel}>Category <span className={styles.req}>*</span></label>
                  <input className={styles.quickAddInput} list="qa-cats" required value={quickAddForm.category}
                    onChange={e => setQuickAddForm(f => ({ ...f, category: e.target.value }))} />
                  <datalist id="qa-cats">
                    {inventoryCategories.filter(c => c !== "All").map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className={styles.quickAddField}>
                  <label className={styles.quickAddLabel}>Supplier <span className={styles.req}>*</span></label>
                  <input className={styles.quickAddInput} required value={quickAddForm.supplier}
                    onChange={e => setQuickAddForm(f => ({ ...f, supplier: e.target.value }))} />
                </div>
                <div className={styles.quickAddField}>
                  <label className={styles.quickAddLabel}>Quantity <span className={styles.req}>*</span></label>
                  <input type="number" min="0" className={styles.quickAddInput} required value={quickAddForm.quantity}
                    onChange={e => setQuickAddForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div className={styles.quickAddField}>
                  <label className={styles.quickAddLabel}>Grams (g) <span className={styles.req}>*</span></label>
                  <input type="number" min="0" step="0.01" className={styles.quickAddInput} required value={quickAddForm.grams}
                    onChange={e => setQuickAddForm(f => ({ ...f, grams: e.target.value }))} />
                </div>
                <div className={styles.quickAddField}>
                  <label className={styles.quickAddLabel}>Cost (₱) <span className={styles.req}>*</span></label>
                  <input type="number" min="0" step="0.01" className={styles.quickAddInput} required value={quickAddForm.price}
                    onChange={e => setQuickAddForm(f => ({ ...f, price: e.target.value }))} />
                </div>
                <div className={styles.quickAddField}>
                  <label className={styles.quickAddLabel}>Selling Price (₱) <span className={styles.req}>*</span></label>
                  <input type="number" min="0" step="0.01" className={styles.quickAddInput} required value={quickAddForm.sellingPrice}
                    onChange={e => setQuickAddForm(f => ({ ...f, sellingPrice: e.target.value }))} />
                </div>
              </div>
              <div className={styles.quickAddNote}>
                Item will be saved to Inventory with status "In Stock". You can add photo &amp; notes later from the Inventory page.
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowQuickAdd(false)}>Cancel</button>
                <button type="submit" className={styles.quickAddSubmitBtn} disabled={quickAddSubmitting}>
                  {quickAddSubmitting ? "Saving..." : "＋ Add to Inventory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Pay Modal ════════════════════════════════════════════ */}
      {payModal && (
        <div className={styles.quickAddOverlay} onClick={() => setPayModal(null)}>
          <div className={styles.quickAddCard} style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div className={styles.itemPickerHeader}>
              <h3 className={styles.itemPickerTitle}>Record Payment</h3>
              <button className={styles.itemPickerClose} onClick={() => setPayModal(null)}>✕</button>
            </div>

            {/* Loan summary */}
            <div style={{ padding: "8px 24px 0", fontSize: 13, color: "#666" }}>
              <div><strong style={{ color: "#222" }}>{payModal.customerName}</strong>{payModal.facebookName ? ` · fb: ${payModal.facebookName}` : ""}</div>
              <div style={{ marginTop: 3 }}>Item: <strong>{payModal.item}</strong></div>
              <div style={{ marginTop: 3, display:"flex", gap: 16 }}>
                <span>Monthly: <strong style={{ color:"#2a9d8f" }}>₱{(payModal.monthlyPayment||0).toLocaleString()}</strong></span>
                <span>Remaining: <strong style={{ color:"#e05a3a" }}>₱{(payModal.remainingBalance||0).toLocaleString()}</strong></span>
              </div>
            </div>

            <form onSubmit={handlePaySubmit}>
              <div className={styles.quickAddGrid} style={{ gridTemplateColumns: "1fr" }}>
                <div className={styles.quickAddField}>
                  <label className={styles.quickAddLabel}>Amount to Pay (₱) <span className={styles.req}>*</span></label>
                  <input type="number" min="0.01" step="0.01"
                    max={payModal.remainingBalance}
                    className={styles.quickAddInput} required
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)} />
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                    Max: ₱{(payModal.remainingBalance || 0).toLocaleString()}
                  </div>
                </div>
                <div className={styles.quickAddField}>
                  <label className={styles.quickAddLabel}>Notes <span style={{ color:"#aaa", fontWeight:400 }}>(optional)</span></label>
                  <textarea className={styles.quickAddInput} rows={3}
                    style={{ height:"auto", resize:"vertical", padding:"8px 12px" }}
                    placeholder="e.g. Half payment agreed, rest next month..."
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)} />
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setPayModal(null)}>Cancel</button>
                <button type="submit" className={styles.quickAddSubmitBtn} disabled={payingId === payModal.id}>
                  {payingId === payModal.id ? "Saving..." : "✓ Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ══ History Modal ════════════════════════════════════════ */}
      {historyModal && (() => {
        const h = loans.find(l => l.id === historyModal.id) || historyModal;
        return (
          <div key="history-modal" className={styles.quickAddOverlay} onClick={() => setHistoryModal(null)}>
            <div className={styles.historyCard} onClick={e => e.stopPropagation()}>
              <div className={styles.historyHeader}>
                <div>
                  <div className={styles.historyTitle}>📋 Item History</div>
                  <div className={styles.historySubtitle}>{h.customerName} · <strong>{h.item}</strong></div>
                </div>
                <button className={styles.itemPickerClose} onClick={() => setHistoryModal(null)}>✕</button>
              </div>

              <div className={styles.historySummary}>
                <div className={styles.historySummaryRow}>
                  <span className={styles.historySummaryLabel}>Payment Terms</span>
                  <span className={styles.historySummaryVal}>{h.paymentTerms || "—"}</span>
                </div>
                <div className={styles.historySummaryRow}>
                  <span className={styles.historySummaryLabel}>Total Payable</span>
                  <span className={styles.historySummaryVal}>₱{(h.totalPrice || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                </div>
                {h.paymentTerms === "Layaway" && (() => {
                  const dueThisMonth = Math.max(0, (h.monthlyPayment || 0) - (h.paidThisMonth || 0));
                  return (<>
                    <div className={styles.historySummaryRow}>
                      <span className={styles.historySummaryLabel}>Monthly</span>
                      <span className={styles.historySummaryVal}>₱{(h.monthlyPayment || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                    </div>
                    <div className={styles.historySummaryRow}>
                      <span className={styles.historySummaryLabel}>Due This Month</span>
                      <span className={styles.historySummaryVal} style={{color: dueThisMonth === 0 ? "#2a9d8f" : "#e07a3a"}}>
                        {dueThisMonth === 0 ? "✓ Paid" : `₱${dueThisMonth.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`}
                      </span>
                    </div>
                  </>);
                })()}
                <div className={styles.historySummaryRow}>
                  <span className={styles.historySummaryLabel}>Remaining</span>
                  <span className={styles.historySummaryVal} style={{color:"#e05a3a"}}>₱{(h.remainingBalance || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                </div>
                <div className={styles.historySummaryRow}>
                  <span className={styles.historySummaryLabel}>Status</span>
                  <span className={`${styles.historySummaryVal} ${h.status === "Paid" ? styles.historyStatusPaid : styles.historyStatusActive}`}>
                    {h.status}
                  </span>
                </div>
                <div className={styles.historySummaryRow}>
                  <span className={styles.historySummaryLabel}>Due Date</span>
                  <span className={styles.historySummaryVal}>{h.dueDate || "—"}</span>
                </div>
                <div className={styles.historySummaryRow}>
                  <span className={styles.historySummaryLabel}>Created Date</span>
                  <span className={styles.historySummaryVal}>{h.purchaseDate || "—"}</span>
                </div>
              </div>

              <div className={styles.historyTimelineLabel}>Activity Log</div>
              <div className={styles.historyTimeline}>
                {h.paymentNotes
                  ? h.paymentNotes.split("|||").map((entry, i) => {
                      // New payment format: "[date] 💳 Payment ₱X.XX by user — note"
                      const payMatch  = entry.match(/^\[(.+?)\]\s*💳\s*Payment\s*(₱[\d,.]+)\s*by\s+(\S+)(?:\s*—\s*(.*))?$/);
                      // New edit format:    "[date] ✏️ Edited by user: details"
                      const editMatch = entry.match(/^\[(.+?)\]\s*✏️\s*Edited by (.+?):\s*(.*)$/);
                      // Legacy format:      "[date] ₱X — note"
                      const legacyMatch = entry.match(/^\[(.+?)\]\s*(₱[\d,.]+)\s*—\s*(.*)$/);

                      const isEdit = !!editMatch;
                      return (
                        <div key={i} className={styles.historyEntry}>
                          <div className={`${styles.historyEntryDot} ${isEdit ? styles.historyEntryDotEdit : ""}`} />
                          <div className={styles.historyEntryBody}>
                            {payMatch ? (
                              <>
                                <div className={styles.historyEntryMeta}>
                                  <span className={styles.historyEntryAmount}>💳 {payMatch[2]}</span>
                                  <span className={styles.historyEntryTime}>{payMatch[1]}</span>
                                </div>
                                <div className={styles.historyEntryNote}>
                                  by <strong>{payMatch[3]}</strong>
                                  {payMatch[4] && <> — {payMatch[4]}</>}
                                </div>
                              </>
                            ) : editMatch ? (
                              <>
                                <div className={styles.historyEntryMeta}>
                                  <span className={styles.historyEntryEdit}>✏️ Edited by {editMatch[2]}</span>
                                  <span className={styles.historyEntryTime}>{editMatch[1]}</span>
                                </div>
                                <div className={styles.historyEntryNote}>{editMatch[3]}</div>
                              </>
                            ) : legacyMatch ? (
                              <>
                                <div className={styles.historyEntryMeta}>
                                  <span className={styles.historyEntryAmount}>{legacyMatch[2]}</span>
                                  <span className={styles.historyEntryTime}>{legacyMatch[1]}</span>
                                </div>
                                {legacyMatch[3] && <div className={styles.historyEntryNote}>{legacyMatch[3]}</div>}
                              </>
                            ) : (
                              <div className={styles.historyEntryNote}>{entry}</div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  : <div className={styles.historyEmpty}>No activity recorded yet.</div>
                }
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ Image Lightbox ════════════════════════════════════════ */}
      {lightboxImg && (
        <div className={styles.lightboxOverlay} onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="Item" className={styles.lightboxImg} />
          <button className={styles.lightboxClose} onClick={() => setLightboxImg(null)}>✕</button>
        </div>
      )}

      {/* ══ Edit Loan Modal ═══════════════════════════════════════ */}
      {editLoan && (
        <div className={styles.modalOverlay} /*onClick={closeEdit}*/>
          <div className={styles.modalCard} /*onClick={e => e.stopPropagation()}*/>
            <h2 className={styles.modalTitle}>Edit Buyer</h2>
            <form onSubmit={handleEditSubmit}>
              <div className={styles.formGrid}>
                {/* Customer Name — required */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Customer Name *</label>
                  <input type="text" className={styles.formInput} required
                    value={editForm.customerName || ""}
                    onChange={e => setEditForm(f => ({ ...f, customerName: e.target.value }))} />
                </div>
                {/* Facebook Name */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Facebook Name</label>
                  <input type="text" className={styles.formInput}
                    value={editForm.facebookName || ""}
                    onChange={e => setEditForm(f => ({ ...f, facebookName: e.target.value }))} />
                </div>
                {/* Mobile Number — required */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Mobile Number *</label>
                  <input type="text" className={styles.formInput} required
                    value={editForm.mobileNumber || ""}
                    onChange={e => setEditForm(f => ({ ...f, mobileNumber: e.target.value }))} />
                </div>
                {/* Item Purchased — required */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Item Purchased *</label>
                  <button type="button" className={`${styles.itemTriggerBtn} ${!editForm.item ? styles.itemTriggerRequired : ""}`}
                    onClick={() => { setItemPickerSearch(""); setItemPickerCategory("All"); setShowItemPicker("edit"); }}>
                    {editForm.item
                      ? <span>{editForm.item}</span>
                      : <span className={styles.itemTriggerPlaceholder}>— Select an item —</span>}
                    <span className={styles.itemTriggerArrow}>▼</span>
                  </button>
                </div>
                {/* Item image preview */}
                {editForm.item && itemImageMap[editForm.item] && (
                  <div className={styles.formField} style={{ gridColumn: "1 / -1" }}>
                    <label className={styles.formLabel}>Item Photo</label>
                    <img src={itemImageMap[editForm.item]} alt={editForm.item}
                      className={styles.itemPreviewImg}
                      onClick={() => setLightboxImg(itemImageMap[editForm.item])}
                      title="Click to enlarge" />
                  </div>
                )}
                {/* Payment Terms */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Payment Terms *</label>
                  <select className={styles.formInput} value={editForm.paymentTerms || "Cash"}
                    onChange={e => setEditForm(f => ({ ...f, paymentTerms: e.target.value, downPayment: "0", monthsToPay: "1" }))}>
                    <option value="Cash">Cash</option>
                    <option value="Layaway">Layaway</option>
                  </select>
                </div>
                {/* Discount */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Discount (₱)</label>
                  <input type="number" min="0" step="0.01" className={styles.formInput}
                    value={editForm.discount || "0"}
                    onChange={e => setEditForm(f => ({ ...f, discount: e.target.value }))} />
                </div>
                {/* Layaway-only fields */}
                {editForm.paymentTerms === "Layaway" && (<>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Down Payment (₱)</label>
                    <input type="number" min="0" step="0.01" className={styles.formInput}
                      value={editForm.downPayment || "0"}
                      onChange={e => setEditForm(f => ({ ...f, downPayment: e.target.value }))} />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Months to Pay</label>
                    <select className={styles.formInput} value={editForm.monthsToPay || "1"}
                      onChange={e => setEditForm(f => ({ ...f, monthsToPay: e.target.value }))}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{m} {m === 1 ? "month" : "months"}</option>
                      ))}
                    </select>
                  </div>
                </>)}
                {/* Auto-calculated readonly fields */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Cost (₱)</label>
                  <input type="text" className={styles.formInput} readOnly
                    value={editSelectedItem ? `₱ ${editCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"} />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Sub Total (₱)</label>
                  <input type="number" min="0" step="0.01" className={styles.formInput}
                    value={editForm.subTotal}
                    onChange={e => setEditForm(f => ({ ...f, subTotal: e.target.value }))} />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Total Payable (₱)</label>
                  <input type="text" className={styles.formInput} readOnly
                    value={editSelectedItem || editForm.subTotal ? `₱ ${editTotalPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"} />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    {editForm.paymentTerms === "Cash" ? "Amount Due (Cash)" : "Monthly Payment (auto)"}
                  </label>
                  <input type="text" className={styles.formInput} readOnly
                    value={editSelectedItem || editForm.subTotal
                      ? `₱ ${editMonthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "—"} />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Remaining Balance (₱)</label>
                  <input type="number" min="0" step="0.01" className={styles.formInput}
                    value={editForm.remainingBalance}
                    onChange={e => setEditForm(f => ({ ...f, remainingBalance: e.target.value }))} />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Profit (₱)</label>
                  <input type="text" className={styles.formInput} readOnly
                    value={editSelectedItem ? `₱ ${editProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"} />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Due Date</label>
                  <input type="date" className={styles.formInput}
                    value={toInputDate(editForm.dueDate)}
                    onChange={e => setEditForm(f => ({ ...f, dueDate: fromInputDate(e.target.value) }))} />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Status</label>
                  <select className={styles.formInput} value={editForm.status}
                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="Active">Active</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={closeEdit}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={editSubmitting || !editForm.item}>
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Add Product Modal (existing customer) ════════════════ */}
      {showAddProduct && (
        <div className={styles.modalOverlay} /*onClick={closeAddProduct}*/>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Add Product to Existing Customer</h2>
            <form onSubmit={handleApSubmit}>
              <div className={styles.formGrid}>

                {/* Customer dropdown */}
                <div className={styles.formField} style={{ gridColumn: "1 / -1" }}>
                  <label className={styles.formLabel}>Customer Name <span className={styles.req}>*</span></label>
                  <select className={styles.formInput} value={apForm.customerName} required
                    onChange={e => {
                      const customer = uniqueCustomers.find(c => c.customerName === e.target.value) || {};
                      setApForm(f => ({ ...f, customerName: e.target.value, facebookName: customer.facebookName || "", mobileNumber: customer.mobileNumber || "" }));
                    }}>
                    <option value="">— Select customer —</option>
                    {uniqueCustomers.map(c => (
                      <option key={c.customerName} value={c.customerName}>{c.customerName}</option>
                    ))}
                  </select>
                </div>

                {/* Auto-populated read-only fields */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Facebook Name</label>
                  <input type="text" className={`${styles.formInput} ${styles.formInputReadonly}`} value={apForm.facebookName || ""} readOnly />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Mobile Number</label>
                  <input type="text" className={`${styles.formInput} ${styles.formInputReadonly}`} value={apForm.mobileNumber || ""} readOnly />
                </div>

                {/* Item picker trigger */}
                <div className={styles.formField} style={{ gridColumn: "1 / -1" }}>
                  <label className={styles.formLabel}>Item Purchased <span className={styles.req}>*</span></label>
                  <button type="button" className={styles.itemTriggerBtn}
                    onClick={() => { setItemPickerSearch(""); setItemPickerCategory("All"); setItemPickerStatus("All"); setShowItemPicker("addProduct"); }}>
                    {apForm.item
                      ? <span>{apForm.item}</span>
                      : <span className={styles.itemTriggerPlaceholder}>— Select an item —</span>}
                    <span className={styles.itemTriggerArrow}>▼</span>
                  </button>
                </div>

                {/* Item image preview */}
                {apSelectedItem?.image && (
                  <div className={styles.formField} style={{ gridColumn: "1 / -1" }}>
                    <label className={styles.formLabel}>Item Photo</label>
                    <img src={apSelectedItem.image} alt={apSelectedItem.name}
                      className={styles.itemPreviewImg}
                      onClick={() => setLightboxImg(apSelectedItem.image)}
                      title="Click to enlarge" />
                  </div>
                )}

                {/* Quantity */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Quantity <span className={styles.req}>*</span></label>
                  <input type="number" min="1" className={styles.formInput} value={apForm.quantity} required
                    onChange={e => setApForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>

                {/* Payment Terms */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Payment Terms <span className={styles.req}>*</span></label>
                  <select className={styles.formInput} value={apForm.paymentTerms}
                    onChange={e => setApForm(f => ({ ...f, paymentTerms: e.target.value, downPayment: "", monthsToPay: "1" }))}>
                    <option value="Cash">Cash</option>
                    <option value="Layaway">Layaway</option>
                  </select>
                </div>

                {/* Layaway-only */}
                {apForm.paymentTerms === "Layaway" && (<>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Down Payment (₱) <span className={styles.req}>*</span></label>
                    <input type="number" min="0" step="0.01" className={styles.formInput} value={apForm.downPayment} required
                      onChange={e => setApForm(f => ({ ...f, downPayment: e.target.value }))} />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Months to Pay <span className={styles.req}>*</span></label>
                    <select className={styles.formInput} value={apForm.monthsToPay}
                      onChange={e => setApForm(f => ({ ...f, monthsToPay: e.target.value }))}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{m} {m === 1 ? "month" : "months"}</option>
                      ))}
                    </select>
                  </div>
                </>)}

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Cost (₱)</label>
                  <input type="text" className={`${styles.formInput} ${styles.formInputReadonly}`}
                    value={apSelectedItem ? `₱ ${apCost.toLocaleString()}` : "—"} readOnly />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Sub Total (₱)</label>
                  <input type="text" className={`${styles.formInput} ${styles.formInputReadonly}`}
                    value={apSelectedItem ? `₱ ${apSubTotal.toLocaleString()}` : "—"} readOnly />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Discount (₱)</label>
                  <input type="number" min="0" step="0.01" className={styles.formInput} value={apForm.discount}
                    onChange={e => setApForm(f => ({ ...f, discount: e.target.value }))} />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Total Payable (₱)</label>
                  <input type="text" className={`${styles.formInput} ${styles.formInputReadonly}`}
                    value={apSelectedItem ? `₱ ${apTotalPayable.toLocaleString()}` : "—"} readOnly />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Profit (₱)</label>
                  <input type="text" className={`${styles.formInput} ${styles.formInputReadonly}`}
                    style={{ color: apProfit >= 0 ? "#4a8a50" : "#e05a3a" }}
                    value={apSelectedItem ? `₱ ${apProfit.toLocaleString()}` : "—"} readOnly />
                </div>

                {apForm.paymentTerms === "Layaway" && (
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Monthly Payment (auto)</label>
                    <input type="text" className={`${styles.formInput} ${styles.formInputReadonly}`}
                      value={apSelectedItem && apMonths > 0 ? `₱ ${apMonthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"} readOnly />
                  </div>
                )}

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Due Date <span className={styles.req}>*</span></label>
                  <input type="date" className={styles.formInput}
                    value={apForm.dueDate || defaultDueDateInput()}
                    onChange={e => setApForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>

              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={closeAddProduct}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={apSubmitting || !apSelectedItem || apTotalPayable <= 0}>
                  {apSubmitting ? "Saving..." : "+ Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Add Buyer Modal ════════════════════════════════════════ */}
      {showModal && (
        <div className={styles.modalOverlay} /*onClick={closeModal}*/>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Add New Buyer</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                {field("customerName", "Customer Name",  "text",   true)}
                {field("facebookName", "Facebook Name",  "text",   false)}
                {field("mobileNumber", "Mobile Number",  "text",   false)}
                {/* Item Purchased — picker popup trigger */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Item Purchased <span className={styles.req}>*</span></label>
                  <button type="button" className={styles.itemTriggerBtn}
                    onClick={() => { setItemPickerSearch(""); setItemPickerCategory("All"); setItemPickerStatus("All"); setShowItemPicker("add"); }}>
                    {form.item
                      ? <span>{form.item}</span>
                      : <span className={styles.itemTriggerPlaceholder}>— Select an item —</span>}
                    <span className={styles.itemTriggerArrow}>▼</span>
                  </button>
                </div>

                {/* Item image preview */}
                {selectedItem?.image && (
                  <div className={styles.formField} style={{ gridColumn: "1 / -1" }}>
                    <label className={styles.formLabel}>Item Photo</label>
                    <img
                      src={selectedItem.image}
                      alt={selectedItem.name}
                      className={styles.itemPreviewImg}
                      onClick={() => setLightboxImg(selectedItem.image)}
                      title="Click to enlarge"
                    />
                  </div>
                )}

                {/* Quantity */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Quantity <span className={styles.req}>*</span></label>
                  <input type="number" min="1" className={styles.formInput} value={form.quantity} required
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>

                {/* Payment Terms */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Payment Terms <span className={styles.req}>*</span></label>
                  <select className={styles.formInput} value={form.paymentTerms}
                    onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value, downPayment: "", monthsToPay: "1" }))}>
                    <option value="Cash">Cash</option>
                    <option value="Layaway">Layaway</option>
                  </select>
                </div>

                {/* Layaway-only: Down Payment + Months to Pay */}
                {form.paymentTerms === "Layaway" && (<>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Down Payment (₱) <span className={styles.req}>*</span></label>
                    <input type="number" min="0" step="0.01" className={styles.formInput} value={form.downPayment} required
                      onChange={e => setForm(f => ({ ...f, downPayment: e.target.value }))} />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Months to Pay <span className={styles.req}>*</span></label>
                    <select className={styles.formInput} value={form.monthsToPay}
                      onChange={e => setForm(f => ({ ...f, monthsToPay: e.target.value }))}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{m} {m === 1 ? "month" : "months"}</option>
                      ))}
                    </select>
                  </div>
                </>)}

                {/* Cost */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Cost (₱)</label>
                  <input type="text" className={`${styles.formInput} ${styles.formInputReadonly}`}
                    value={selectedItem ? `₱ ${calcCost.toLocaleString()}` : "—"} readOnly />
                </div>
                {/* Sub Total */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Sub Total (₱)</label>
                  <input type="text" className={`${styles.formInput} ${styles.formInputReadonly}`}
                    value={selectedItem ? `₱ ${calcSubTotal.toLocaleString()}` : "—"} readOnly />
                </div>
                {/* Discount */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Discount (₱)</label>
                  <input type="number" min="0" step="0.01" className={styles.formInput} value={form.discount}
                    onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} />
                </div>
                {/* Total Payable */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Total Payable (₱)</label>
                  <input type="text" className={`${styles.formInput} ${styles.formInputReadonly}`}
                    value={selectedItem ? `₱ ${calcTotalPayable.toLocaleString()}` : "—"} readOnly />
                </div>
                {/* Profit */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Profit (₱)</label>
                  <input type="text" className={`${styles.formInput} ${styles.formInputReadonly}`}
                    style={{ color: calcProfit >= 0 ? "#4a8a50" : "#e05a3a" }}
                    value={selectedItem ? `₱ ${calcProfit.toLocaleString()}` : "—"} readOnly />
                </div>

                {/* Layaway-only: Monthly Payment */}
                {form.paymentTerms === "Layaway" && (
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Monthly Payment (auto)</label>
                    <input type="text" className={`${styles.formInput} ${styles.formInputReadonly}`}
                      value={selectedItem && calcMonths > 0 ? `₱ ${calcMonthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"} readOnly />
                  </div>
                )}

                {/* Due Date */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Due Date <span className={styles.req}>*</span></label>
                  <input type="date" className={styles.formInput}
                    value={form.dueDate || defaultDueDateInput()}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={submitting || !selectedItem || calcTotalPayable <= 0}>
                  {submitting ? "Saving..." : "+ Add Buyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
