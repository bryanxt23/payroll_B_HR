package com.payroll.backend.inventory;

import com.payroll.backend.activity.ActivityLog;
import com.payroll.backend.activity.ActivityLogRepository;
import com.payroll.backend.store.StoreContextHolder;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryItemRepository repo;
    private final ActivityLogRepository activityRepo;
    private final CloudinaryService cloudinaryService;

    public InventoryController(InventoryItemRepository repo, ActivityLogRepository activityRepo,
                                CloudinaryService cloudinaryService) {
        this.repo             = repo;
        this.activityRepo     = activityRepo;
        this.cloudinaryService = cloudinaryService;
    }

    private Long sid() { return StoreContextHolder.getStoreId(); }

    @GetMapping
    public List<InventoryItem> list() {
        return repo.findByStoreId(sid());
    }

    /**
     * Upload (or replace) an inventory image. The Cloudinary public_id is
     * derived from the original file name, so re-uploading a file with the
     * same name destroys the previous asset and writes a new one in its
     * place. Uses signed upload with overwrite=true + invalidate=true on
     * the server side, so no Cloudinary preset configuration is needed.
     */
    @PostMapping(value = "/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> uploadImage(@RequestParam("file") MultipartFile file) throws java.io.IOException {
        String publicId = slugifyFileName(file.getOriginalFilename());
        // Explicit destroy first, then upload — same effect as overwrite=true
        // but also clears any stale CDN cache entries before the new asset
        // is written. The destroy is a no-op if nothing matches.
        cloudinaryService.deleteByPublicId("inventory/" + publicId);
        String url = cloudinaryService.uploadWithPublicId(file, "inventory", publicId);
        return Map.of("url", url);
    }

    /**
     * Admin-only cleanup: scan the Cloudinary "inventory/" folder, group
     * assets by their original filename, keep the newest one in each
     * group plus anything still referenced by an InventoryItem row, and
     * delete everything else. Returns a summary of what was removed.
     */
    @PostMapping("/cleanup-duplicates")
    public Map<String, Object> cleanupDuplicates(
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!"Admin".equals(role)) {
            return Map.of("error", "Forbidden — admin only");
        }
        // Build the protected URL set: every image URL currently in use by
        // any inventory item across all stores. Cleanup is global because
        // Cloudinary assets aren't partitioned by store.
        Set<String> inUseUrls = new HashSet<>();
        for (InventoryItem item : repo.findAll()) {
            String url = item.getImage();
            if (url != null && !url.isBlank()) inUseUrls.add(url);
        }
        return cloudinaryService.cleanupInventoryDuplicates(inUseUrls);
    }

    /** Slugify a file name into a Cloudinary-safe public_id (no extension). */
    private static String slugifyFileName(String name) {
        if (name == null || name.isBlank()) return "image";
        String stripped = name.replaceAll("\\.[^.]+$", "")
                              .toLowerCase()
                              .replaceAll("[^a-z0-9]+", "-")
                              .replaceAll("^-+|-+$", "");
        return stripped.isEmpty() ? "image" : stripped;
    }

    @PostMapping
    public InventoryItem create(@RequestBody @NonNull InventoryItem item,
                                @RequestHeader(value = "X-Username", defaultValue = "system") String username) {
        item.setStoreId(sid());
        InventoryItem saved = repo.save(item);

        ActivityLog log = new ActivityLog();
        log.setStoreId(sid());
        log.setIcon("inventory");
        log.setEntityName(saved.getName());
        log.setAction("added to inventory"
                + (saved.getCategory() != null ? " — " + saved.getCategory() : ""));
        log.setUsername(username);
        log.setCategory("INVENTORY");
        log.setActionType("Added");
        log.setTargetName(saved.getName());
        log.setDetails("Qty " + (saved.getQuantity() != null ? saved.getQuantity() : 0)
                + ", Price ₱" + fmtNum(saved.getPrice())
                + (saved.getCategory() != null ? ", Category " + saved.getCategory() : ""));
        activityRepo.save(log);

        return saved;
    }

    @PutMapping("/{id}")
    public InventoryItem update(@PathVariable @NonNull Long id,
                                @RequestBody @NonNull InventoryItem updated,
                                @RequestHeader(value = "X-Username", defaultValue = "system") String username) {
        InventoryItem item = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Item not found: " + id));

        List<String> changes = new ArrayList<>();
        if (updated.getQuantity() != null && !Objects.equals(item.getQuantity(), updated.getQuantity()))
            changes.add("Qty " + item.getQuantity() + " → " + updated.getQuantity());
        if (updated.getSellingPrice() != null && !Objects.equals(item.getSellingPrice(), updated.getSellingPrice()))
            changes.add("Selling Price ₱" + fmtNum(item.getSellingPrice()) + " → ₱" + fmtNum(updated.getSellingPrice()));
        if (updated.getPrice() != null && !Objects.equals(item.getPrice(), updated.getPrice()))
            changes.add("Price ₱" + fmtNum(item.getPrice()) + " → ₱" + fmtNum(updated.getPrice()));
        if (updated.getStatus() != null && !updated.getStatus().equals(item.getStatus()))
            changes.add("Status: " + item.getStatus() + " → " + updated.getStatus());
        if (updated.getCategory() != null && !updated.getCategory().equals(item.getCategory()))
            changes.add("Category: " + item.getCategory() + " → " + updated.getCategory());
        if (updated.getName() != null && !updated.getName().equals(item.getName()))
            changes.add("Name: " + item.getName() + " → " + updated.getName());

        boolean isPriceOrCatOrNameChange = changes.stream().anyMatch(c ->
                c.startsWith("Selling Price") || c.startsWith("Price ₱")
                || c.startsWith("Category") || c.startsWith("Name"));
        String actionType = isPriceOrCatOrNameChange ? "Edited" : "Stock Update";
        String details = changes.isEmpty() ? "Item updated" : String.join(", ", changes);

        if (updated.getName()         != null) item.setName(updated.getName());
        if (updated.getCategory()     != null) item.setCategory(updated.getCategory());
        if (updated.getStatus()       != null) item.setStatus(updated.getStatus());
        if (updated.getQuantity()     != null) item.setQuantity(updated.getQuantity());
        if (updated.getPrice()        != null) item.setPrice(updated.getPrice());
        if (updated.getSupplier()     != null) item.setSupplier(updated.getSupplier());
        if (updated.getSellingPrice() != null) item.setSellingPrice(updated.getSellingPrice());
        item.setGrams(updated.getGrams());
        item.setNotes(updated.getNotes());
        String oldImage = item.getImage();
        String newImage = updated.getImage();
        if (!Objects.equals(oldImage, newImage)) {
            cloudinaryService.deleteByUrl(oldImage);
        }
        item.setImage(newImage);
        InventoryItem saved = repo.save(item);

        ActivityLog log = new ActivityLog();
        log.setStoreId(sid());
        log.setIcon(saved.getStatus() != null && saved.getStatus().equals("Out of Stock") ? "outofstock" : "edit");
        log.setEntityName(saved.getName());
        log.setAction(saved.getStatus() != null && saved.getStatus().equals("Out of Stock")
                ? "marked Out of Stock" : "inventory item updated");
        log.setUsername(username);
        log.setCategory("INVENTORY");
        log.setActionType(actionType);
        log.setTargetName(saved.getName());
        log.setDetails(details);
        activityRepo.save(log);

        return saved;
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable @NonNull Long id,
                       @RequestHeader(value = "X-Username", defaultValue = "system") String username) {
        InventoryItem item = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Item not found: " + id));

        ActivityLog log = new ActivityLog();
        log.setStoreId(sid());
        log.setIcon("edit");
        log.setEntityName(item.getName());
        log.setAction("removed from inventory");
        log.setUsername(username);
        log.setCategory("INVENTORY");
        log.setActionType("Deleted");
        log.setTargetName(item.getName());
        log.setDetails("Item removed from inventory");
        activityRepo.save(log);

        cloudinaryService.deleteByUrl(item.getImage());
        repo.deleteById(id);
    }

    private String fmtNum(Double n) { return n == null ? "0" : String.format("%.0f", n); }
}
