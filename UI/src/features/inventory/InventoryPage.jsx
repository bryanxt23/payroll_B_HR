import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./InventoryPage.module.css";
import { isAdmin, canAddInventory, canEditInventory, canDeleteInventory, canManageCategories, canDeleteCategories } from "../../utils/permissions";

import API from "../../config";

const CLOUDINARY_CLOUD_NAME   = "dm8tng6rp";
const CLOUDINARY_UPLOAD_PRESET = "inventory_upload";

function getUser() {
  try { return JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "null"); }
  catch { return null; }
}
function authUsername() { return getUser()?.username || "system"; }
const STATUSES = ["In Stock", "Pending", "Out of Stock"];
const TABS     = ["All", "In Stock", "Pending", "Out of Stock"];
const PAGE_SIZE = 7;
const EMPTY_FORM = { name: "", category: "", status: "In Stock", quantity: "", price: "", supplier: "", sellingPrice: "", image: "" };

function buildPagerPages(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
  const last = totalPages - 1;
  if (page <= 3)        return [0, 1, 2, 3, 4, "...", last];
  if (page >= last - 3) return [0, "...", last-4, last-3, last-2, last-1, last];
  return                       [0, "...", page-1, page, page+1, "...", last];
}

export default function InventoryPage() {
  const [items, setItems]                   = useState([]);
  const [activeTab, setActiveTab]           = useState("All");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedStatuses, setSelectedStatuses]     = useState([]);
  const [search, setSearch]                 = useState("");
  const [page, setPage]                     = useState(0);
  const [sortCol, setSortCol]               = useState(null);
  const [sortDir, setSortDir]               = useState("asc");

  // categories stored as [{id, name}]
  const [categories, setCategories]         = useState([]);
  const [newCat, setNewCat]                 = useState("");
  const [editCat, setEditCat]               = useState(null); // {id, name} being edited

  // add item modal
  const [showModal, setShowModal]           = useState(false);
  const [form, setForm]                     = useState(EMPTY_FORM);
  const [formError, setFormError]           = useState("");
  const [submitting, setSubmitting]         = useState(false);

  // edit item modal
  const [editItem, setEditItem]             = useState(null);
  const [editForm, setEditForm]             = useState(EMPTY_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // lightbox
  const [lightboxImg, setLightboxImg]       = useState(null);

  // image upload state
  const [addImgUploading,  setAddImgUploading]  = useState(false);
  const [editImgUploading, setEditImgUploading] = useState(false);

  // image file refs
  const addImgRef  = useRef(null);
  const editImgRef = useRef(null);

  const uploadImageFile = async (file, cb, setUploading) => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "inventory");
    try {
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.secure_url) {
        cb(data.secure_url);
      } else {
        alert("Image upload failed: " + (data.error?.message || "Unknown error"));
      }
    } catch {
      alert("Image upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Fetch data ─────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/api/inventory`)
      .then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/categories`)
      .then(r => r.json()).then(d => Array.isArray(d) && setCategories(d)).catch(() => {});
  }, []);

  useEffect(() => { setPage(0); }, [activeTab, selectedCategories, selectedStatuses, search, sortCol, sortDir]);

  const catNames = useMemo(() => categories.map(c => c.name), [categories]);

  const counts = useMemo(() => ({
    inStock:    items.filter(i => i.status === "In Stock").length,
    pending:    items.filter(i => i.status === "Pending").length,
    outOfStock: items.filter(i => i.status === "Out of Stock").length,
  }), [items]);

  const filteredData = useMemo(() => {
    let list = items.filter(item => {
      const matchesTab      = activeTab === "All" || item.status === activeTab;
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);
      const matchesStatus   = selectedStatuses.length === 0   || selectedStatuses.includes(item.status);
      const matchesSearch   = (item.name || "").toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesCategory && matchesStatus && matchesSearch;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    if      (sortCol === "name")         list = [...list].sort((a,b) => dir*(a.name||"").localeCompare(b.name||""));
    else if (sortCol === "category")     list = [...list].sort((a,b) => dir*(a.category||"").localeCompare(b.category||""));
    else if (sortCol === "status")       list = [...list].sort((a,b) => dir*(a.status||"").localeCompare(b.status||""));
    else if (sortCol === "supplier")     list = [...list].sort((a,b) => dir*(a.supplier||"").localeCompare(b.supplier||""));
    else if (sortCol === "quantity")     list = [...list].sort((a,b) => dir*((a.quantity||0)-(b.quantity||0)));
    else if (sortCol === "price")        list = [...list].sort((a,b) => dir*((a.price||0)-(b.price||0)));
    else if (sortCol === "sellingPrice") list = [...list].sort((a,b) => dir*((a.sellingPrice||0)-(b.sellingPrice||0)));
    else list = [...list].sort((a,b) => (b.updatedAt||b.createdAt||"").localeCompare(a.updatedAt||a.createdAt||""));
    return list;
  }, [items, activeTab, selectedCategories, selectedStatuses, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const pagedData  = filteredData.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pagerPages = buildPagerPages(page, totalPages);

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const sortIcon = col => <span className={styles.sortIcon}>{sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "⇅"}</span>;

  const toggleCategory = cat => setSelectedCategories(p => p.includes(cat) ? p.filter(x => x !== cat) : [...p, cat]);
  const toggleStatus   = st  => setSelectedStatuses(p   => p.includes(st)  ? p.filter(x => x !== st)  : [...p, st]);

  // ── Category CRUD ──────────────────────────────────────────────
  const saveCategory = () => {
    const trimmed = newCat.trim();
    if (!trimmed || catNames.includes(trimmed)) { setNewCat(""); return; }
    fetch(`${API}/api/categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }) })
      .then(r => r.json())
      .then(saved => { setCategories(prev => [...prev, saved]); setNewCat(""); })
      .catch(() => {});
  };

  const renameCategory = (cat) => {
    const name = editCat?.name?.trim();
    if (!name || name === cat.name) { setEditCat(null); return; }
    fetch(`${API}/api/categories/${cat.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) })
      .then(r => r.json())
      .then(updated => {
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
        setEditCat(null);
      }).catch(() => {});
  };

  const deleteCategory = (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    fetch(`${API}/api/categories/${cat.id}`, { method: "DELETE" })
      .then(() => setCategories(prev => prev.filter(c => c.id !== cat.id)))
      .catch(() => {});
  };

  // ── Add Item ───────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    const duplicate = items.some(i => i.name?.trim().toLowerCase() === form.name.trim().toLowerCase());
    if (duplicate) { setFormError(`"${form.name}" already exists in inventory.`); return; }
    setFormError(""); setSubmitting(true);
    const body = { name: form.name, category: form.category, status: form.status, quantity: parseInt(form.quantity)||0, price: parseFloat(form.price)||0, supplier: form.supplier, sellingPrice: parseFloat(form.sellingPrice)||0, image: form.image || null };
    fetch(`${API}/api/inventory`, { method: "POST", headers: { "Content-Type": "application/json", "X-Username": authUsername() }, body: JSON.stringify(body) })
      .then(r => r.json())
      .then(newItem => { setItems(prev => [...prev, newItem]); setShowModal(false); setForm(EMPTY_FORM); })
      .catch(() => {}).finally(() => setSubmitting(false));
  };

  // ── Edit Item ──────────────────────────────────────────────────
  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({ name: item.name||"", category: item.category||"", status: item.status||"In Stock", quantity: String(item.quantity??0), price: String(item.price??0), supplier: item.supplier||"", sellingPrice: String(item.sellingPrice??0), image: item.image||"" });
  };

  const handleDelete = (item) => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    fetch(`${API}/api/inventory/${item.id}`, { method: "DELETE", headers: { "X-Username": authUsername() } })
      .then(() => setItems(prev => prev.filter(i => i.id !== item.id)))
      .catch(() => {});
  };

  const handleEditSubmit = (e) => {
    e.preventDefault(); setEditSubmitting(true);
    const body = { name: editForm.name, category: editForm.category, status: editForm.status, quantity: parseInt(editForm.quantity)||0, price: parseFloat(editForm.price)||0, supplier: editForm.supplier, sellingPrice: parseFloat(editForm.sellingPrice)||0, image: editForm.image || null };
    fetch(`${API}/api/inventory/${editItem.id}`, { method: "PUT", headers: { "Content-Type": "application/json", "X-Username": authUsername() }, body: JSON.stringify(body) })
      .then(r => r.json())
      .then(updated => { setItems(prev => prev.map(i => i.id === updated.id ? updated : i)); setEditItem(null); })
      .catch(() => {}).finally(() => setEditSubmitting(false));
  };

  const fmt = n => (n ?? 0).toLocaleString();

  return (
    <div className={styles.page}>
      <div className={styles.contentWrap}>
        <section className={styles.mainCard}>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Inventory</h1>
            <div className={styles.headerActions}>
              <div className={styles.searchWrap}>
                <span className={styles.searchIcon}>⌕</span>
                <input className={styles.searchInput} placeholder="Search item..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </div>

          <div className={styles.summaryBar}>
            <div className={styles.summaryLeft}>
              <div className={styles.summaryItem}><span>In Stock</span><span className={`${styles.countBadge} ${styles.goldBadge}`}>{counts.inStock}</span></div>
              <div className={styles.divider} />
              <div className={styles.summaryItem}><span>Pending</span><span className={`${styles.countBadge} ${styles.grayBadge}`}>{counts.pending}</span></div>
              <div className={styles.divider} />
              <div className={styles.summaryItem}><span>Out of Stock</span><span className={`${styles.countBadge} ${styles.redBadge}`}>{counts.outOfStock}</span></div>
            </div>
            {canAddInventory() && <button className={styles.addBtn} onClick={() => setShowModal(true)}>+ Add Item</button>}
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableTabs}>
              {TABS.map(tab => (
                <button key={tab} className={`${styles.tableTab} ${activeTab === tab ? styles.activeTableTab : ""}`} onClick={() => setActiveTab(tab)}>{tab}</button>
              ))}
            </div>

            <div className={`${styles.tableHeader} ${!isAdmin() ? styles.rowRestricted : ""}`}>
              <div className={styles.colCheck}><input type="checkbox" /></div>
              <div className={`${styles.colItem}     ${styles.sortableCol}`} onClick={() => handleSort("name")}>Item {sortIcon("name")}</div>
              <div className={`${styles.colCategory} ${styles.sortableCol}`} onClick={() => handleSort("category")}>Category {sortIcon("category")}</div>
              <div className={`${styles.colStatus}   ${styles.sortableCol}`} onClick={() => handleSort("status")}>Status {sortIcon("status")}</div>
              <div className={`${styles.colQty}      ${styles.sortableCol}`} onClick={() => handleSort("quantity")}>Qty {sortIcon("quantity")}</div>
              {isAdmin() && <div className={`${styles.colPrice}    ${styles.sortableCol}`} onClick={() => handleSort("price")}>Price {sortIcon("price")}</div>}
              {isAdmin() && <div className={`${styles.colSupplier} ${styles.sortableCol}`} onClick={() => handleSort("supplier")}>Supplier {sortIcon("supplier")}</div>}
              <div className={`${styles.colSelling}  ${styles.sortableCol}`} onClick={() => handleSort("sellingPrice")}>Selling Price {sortIcon("sellingPrice")}</div>
              <div className={styles.colMenu}></div>
            </div>

            <div className={styles.rows}>
              {pagedData.length === 0 && <div className={styles.emptyMsg}>No items found.</div>}
              {pagedData.map(item => (
                <div key={item.id} className={`${styles.row} ${!isAdmin() ? styles.rowRestricted : ""}`}>
                  <div className={styles.colCheck}><input type="checkbox" /></div>
                  <div className={styles.colItem}>
                    <div className={styles.itemCell}>
                      {item.image
                        ? <img src={item.image} alt={item.name} className={styles.itemImage} onClick={() => setLightboxImg(item.image)} title="Click to enlarge" />
                        : <div className={styles.itemImgPlaceholder}>📦</div>
                      }
                      <span className={styles.itemName}>{item.name}</span>
                    </div>
                  </div>
                  <div className={styles.colCategory}>{item.category}</div>
                  <div className={styles.colStatus}>
                    <span className={`${styles.statusPill} ${item.status === "In Stock" ? styles.stockPill : item.status === "Pending" ? styles.pendingPill : styles.outPill}`}>{item.status}</span>
                  </div>
                  <div className={styles.colQty}>{item.quantity ?? 0}</div>
                  {isAdmin() && <div className={styles.colPrice}>₱{fmt(item.price)}</div>}
                  {isAdmin() && <div className={styles.colSupplier}>{item.supplier || "—"}</div>}
                  <div className={styles.colSelling}>₱{fmt(item.sellingPrice)}</div>
                  <div className={styles.colMenu}>
                    {canEditInventory()   && <button className={styles.menuBtn}   onClick={() => openEdit(item)}    title="Edit">✎</button>}
                    {canDeleteInventory() && <button className={styles.deleteBtn} onClick={() => handleDelete(item)} title="Delete">🗑</button>}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.pagination}>
              <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(0, p-1))} style={{ opacity: page===0?0.4:1, pointerEvents: page===0?"none":"auto" }}>‹</button>
              {pagerPages.map((p, idx) =>
                p === "..." ? <span key={`d${idx}`} style={{ padding:"0 4px",color:"#999" }}>…</span>
                : <button key={p} className={`${styles.pageBtn} ${p===page?styles.activePage:""}`} onClick={() => setPage(p)}>{p+1}</button>
              )}
              <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages-1, p+1))} style={{ opacity: page>=totalPages-1?0.4:1, pointerEvents: page>=totalPages-1?"none":"auto" }}>›</button>
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

          <div className={styles.filterCard}>
            <div className={styles.cardTop}><span className={styles.cardTitle}>Category</span></div>
            <div className={styles.optionList}>
              {categories.map(cat => (
                <div key={cat.id} className={styles.catRow}>
                  {editCat?.id === cat.id ? (
                    <div className={styles.catEditRow}>
                      <input autoFocus className={styles.catEditInput} value={editCat.name}
                        onChange={e => setEditCat(c => ({ ...c, name: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") renameCategory(cat); if (e.key === "Escape") setEditCat(null); }} />
                      <button className={styles.catSaveBtn} onClick={() => renameCategory(cat)}>✓</button>
                      <button className={styles.catCancelBtn} onClick={() => setEditCat(null)}>✕</button>
                    </div>
                  ) : (
                    <>
                      <label className={styles.catCheckLabel}>
                        <input type="checkbox" checked={selectedCategories.includes(cat.name)} onChange={() => toggleCategory(cat.name)} />
                        <span className={styles.catName}>{cat.name}</span>
                      </label>
                      <div className={styles.catActions}>
                        {canManageCategories()  && <button className={styles.catEditBtn}   onClick={() => setEditCat({ ...cat })} title="Rename">✎</button>}
                        {canDeleteCategories()  && <button className={styles.catDeleteBtn} onClick={() => deleteCategory(cat)}    title="Delete">🗑</button>}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            {canManageCategories() && (
              <div className={styles.addCatRow}>
                <input type="text" className={styles.addCatInput} placeholder="New category..."
                  value={newCat} onChange={e => setNewCat(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveCategory(); } }} />
                <button className={styles.addCatBtn} onClick={saveCategory}>+</button>
              </div>
            )}
          </div>

          <div className={styles.filterCard}>
            <div className={styles.cardTop}><span className={styles.cardTitle}>Status</span></div>
            <div className={styles.optionList}>
              {STATUSES.map(status => {
                const count = status==="In Stock" ? counts.inStock : status==="Pending" ? counts.pending : counts.outOfStock;
                return (
                  <label key={status} className={styles.optionRow}>
                    <div className={styles.optionLeft}>
                      <input type="checkbox" checked={selectedStatuses.includes(status)} onChange={() => toggleStatus(status)} />
                      <span>{status}</span>
                    </div>
                    <span className={styles.statusCount}>{count}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <button className={styles.applyBtn} onClick={() => { setSelectedCategories([]); setSelectedStatuses([]); setSearch(""); setActiveTab("All"); }}>Clear Filters</button>
        </aside>
      </div>

      {/* ══ Lightbox ══════════════════════════════════════════════ */}
      {lightboxImg && (
        <div className={styles.lightboxOverlay} onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="Item" className={styles.lightboxImg} />
          <button className={styles.lightboxClose} onClick={() => setLightboxImg(null)}>✕</button>
        </div>
      )}

      {/* ══ Add Item Modal ════════════════════════════════════════ */}
      {showModal && (
        <div className={styles.modalOverlay} /*onClick={() => { setShowModal(false); setForm(EMPTY_FORM); setFormError(""); }}*/>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Add New Item</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.formField} style={{ gridColumn:"1/-1" }}>
                  <label className={styles.formLabel}>Item Name <span className={styles.req}>*</span></label>
                  <input type="text" className={`${styles.formInput} ${formError ? styles.inputError : ""}`} value={form.name} required onChange={e => { setForm(f=>({...f,name:e.target.value})); setFormError(""); }} />
                  {formError && <div className={styles.fieldError}>{formError}</div>}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Category <span className={styles.req}>*</span></label>
                  <select className={styles.formInput} value={form.category} required onChange={e => setForm(f=>({...f,category:e.target.value}))}>
                    <option value="">— Select —</option>
                    {catNames.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Status</label>
                  <select className={styles.formInput} value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}>
                    {STATUSES.map(s => <option key={s} value={s} disabled={s === "Out of Stock" && parseInt(form.quantity||0) > 0}>{s}</option>)}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Quantity <span className={styles.req}>*</span></label>
                  <input type="number" min="0" className={styles.formInput} value={form.quantity} required onChange={e => {
                    const qty = e.target.value;
                    setForm(f => ({ ...f, quantity: qty, status: parseInt(qty||0) === 0 ? "Out of Stock" : f.status === "Out of Stock" ? "In Stock" : f.status }));
                  }} />
                </div>
                {isAdmin() && <div className={styles.formField}>
                  <label className={styles.formLabel}>Supplier</label>
                  <input type="text" className={styles.formInput} value={form.supplier} onChange={e => setForm(f=>({...f,supplier:e.target.value}))} />
                </div>}
                {isAdmin() && <div className={styles.formField}>
                  <label className={styles.formLabel}>Price (₱) <span className={styles.req}>*</span></label>
                  <input type="number" min="0" step="0.01" className={styles.formInput} value={form.price} required onChange={e => setForm(f=>({...f,price:e.target.value}))} />
                </div>}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Selling Price (₱) <span className={styles.req}>*</span></label>
                  <input type="number" min="0" step="0.01" className={styles.formInput} value={form.sellingPrice} required onChange={e => setForm(f=>({...f,sellingPrice:e.target.value}))} />
                </div>
                <div className={styles.formField} style={{ gridColumn:"1/-1" }}>
                  <label className={styles.formLabel}>Item Photo</label>
                  <label className={styles.imgPickerWrap}>
                    {form.image
                      ? <img src={form.image} alt="preview" className={styles.imgPickerPreview} />
                      : <div className={styles.imgPickerPlaceholder}><span className={styles.imgPickerIcon}>📷</span><span>Click to choose photo</span></div>
                    }
                    <input ref={addImgRef} type="file" accept="image/*" style={{ display:"none" }}
                      onChange={e => uploadImageFile(e.target.files[0], url => setForm(f => ({ ...f, image: url })), setAddImgUploading)} />
                  </label>
                  {addImgUploading && <span className={styles.imgUploadingMsg}>Uploading...</span>}
                  {form.image && !addImgUploading && <button type="button" className={styles.imgClearBtn} onClick={() => { setForm(f=>({...f,image:""})); if(addImgRef.current) addImgRef.current.value=""; }}>Remove Photo</button>}
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => { setShowModal(false); setForm(EMPTY_FORM); setFormError(""); }}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={submitting || addImgUploading}>{submitting ? "Saving..." : "+ Add Item"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Edit Item Modal ═══════════════════════════════════════ */}
      {editItem && (
        <div className={styles.modalOverlay} /*onClick={() => setEditItem(null)}*/>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Edit Item</h2>
            <form onSubmit={handleEditSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.formField} style={{ gridColumn:"1/-1" }}>
                  <label className={styles.formLabel}>Item Name <span className={styles.req}>*</span></label>
                  <input type="text" className={styles.formInput} value={editForm.name} required onChange={e => setEditForm(f=>({...f,name:e.target.value}))} />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Category</label>
                  <select className={styles.formInput} value={editForm.category} onChange={e => setEditForm(f=>({...f,category:e.target.value}))}>
                    <option value="">— Select —</option>
                    {catNames.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Status</label>
                  <select className={styles.formInput} value={editForm.status} onChange={e => setEditForm(f=>({...f,status:e.target.value}))}>
                    {STATUSES.map(s => <option key={s} value={s} disabled={s === "Out of Stock" && parseInt(editForm.quantity||0) > 0}>{s}</option>)}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Quantity</label>
                  <input type="number" min="0" className={styles.formInput} value={editForm.quantity} onChange={e => {
                    const qty = e.target.value;
                    setEditForm(f => ({ ...f, quantity: qty, status: parseInt(qty||0) === 0 ? "Out of Stock" : f.status === "Out of Stock" ? "In Stock" : f.status }));
                  }} />
                </div>
                {isAdmin() && <div className={styles.formField}>
                  <label className={styles.formLabel}>Supplier</label>
                  <input type="text" className={styles.formInput} value={editForm.supplier} onChange={e => setEditForm(f=>({...f,supplier:e.target.value}))} />
                </div>}
                {isAdmin() && <div className={styles.formField}>
                  <label className={styles.formLabel}>Price (₱)</label>
                  <input type="number" min="0" step="0.01" className={styles.formInput} value={editForm.price} onChange={e => setEditForm(f=>({...f,price:e.target.value}))} />
                </div>}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Selling Price (₱)</label>
                  <input type="number" min="0" step="0.01" className={styles.formInput} value={editForm.sellingPrice} onChange={e => setEditForm(f=>({...f,sellingPrice:e.target.value}))} />
                </div>
                <div className={styles.formField} style={{ gridColumn:"1/-1" }}>
                  <label className={styles.formLabel}>Item Photo</label>
                  <label className={styles.imgPickerWrap}>
                    {editForm.image
                      ? <img src={editForm.image} alt="preview" className={styles.imgPickerPreview} />
                      : <div className={styles.imgPickerPlaceholder}><span className={styles.imgPickerIcon}>📷</span><span>Click to choose photo</span></div>
                    }
                    <input ref={editImgRef} type="file" accept="image/*" style={{ display:"none" }}
                      onChange={e => uploadImageFile(e.target.files[0], url => setEditForm(f => ({ ...f, image: url })), setEditImgUploading)} />
                  </label>
                  {editImgUploading && <span className={styles.imgUploadingMsg}>Uploading...</span>}
                  {editForm.image && !editImgUploading && <button type="button" className={styles.imgClearBtn} onClick={() => { setEditForm(f=>({...f,image:""})); if(editImgRef.current) editImgRef.current.value=""; }}>Remove Photo</button>}
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setEditItem(null)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={editSubmitting || editImgUploading}>{editSubmitting ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
