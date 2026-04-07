package com.payroll.backend.inventory;

import com.payroll.backend.activity.ActivityLog;
import com.payroll.backend.activity.ActivityLogRepository;
import com.payroll.backend.store.StoreContextHolder;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

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
