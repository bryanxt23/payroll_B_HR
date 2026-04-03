package com.payroll.backend.admin;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.payroll.backend.activity.ActivityLog;
import com.payroll.backend.activity.ActivityLogRepository;
import com.payroll.backend.inventory.Category;
import com.payroll.backend.inventory.CategoryRepository;
import com.payroll.backend.inventory.InventoryItem;
import com.payroll.backend.inventory.InventoryItemRepository;
import com.payroll.backend.payment.Payment;
import com.payroll.backend.payment.PaymentRepository;
import com.payroll.backend.sales.SalesLoan;
import com.payroll.backend.sales.SalesLoanRepository;
import com.payroll.backend.store.StoreContextHolder;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final SalesLoanRepository salesRepo;
    private final InventoryItemRepository inventoryRepo;
    private final CategoryRepository categoryRepo;
    private final PaymentRepository paymentRepo;
    private final ActivityLogRepository activityRepo;
    private final ObjectMapper objectMapper;

    public AdminController(SalesLoanRepository salesRepo, InventoryItemRepository inventoryRepo,
                           CategoryRepository categoryRepo, PaymentRepository paymentRepo,
                           ActivityLogRepository activityRepo, ObjectMapper objectMapper) {
        this.salesRepo     = salesRepo;
        this.inventoryRepo = inventoryRepo;
        this.categoryRepo  = categoryRepo;
        this.paymentRepo   = paymentRepo;
        this.activityRepo  = activityRepo;
        this.objectMapper  = objectMapper;
    }

    private Long sid() { return StoreContextHolder.getStoreId(); }

    // ── EXPORT ───────────────────────────────────────────────────

    @GetMapping("/export")
    public void export(HttpServletResponse response) throws IOException {
        response.setContentType("text/plain;charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=\"mrstyles_backup.txt\"");

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("exportedAt",   LocalDateTime.now().toString());
        data.put("storeId",      sid());
        data.put("sales",        salesRepo.findByStoreId(sid()));
        data.put("inventory",    inventoryRepo.findByStoreId(sid()));
        data.put("categories",   categoryRepo.findByStoreId(sid()));
        data.put("payments",     paymentRepo.findByStoreId(sid()));
        data.put("activityLogs", activityRepo.findByStoreId(sid()));

        objectMapper.writerWithDefaultPrettyPrinter()
                    .writeValue(response.getOutputStream(), data);
    }

    // ── CLEAR (current store only) ────────────────────────────────

    @DeleteMapping("/clear")
    public Map<String, String> clear() {
        Long storeId = sid();
        activityRepo.deleteByStoreId(storeId);
        paymentRepo.deleteByStoreId(storeId);
        salesRepo.deleteByStoreId(storeId);
        inventoryRepo.deleteByStoreId(storeId);
        categoryRepo.deleteByStoreId(storeId);
        return Map.of("status", "cleared");
    }

    // ── IMPORT ───────────────────────────────────────────────────

    @PostMapping(value = "/import", consumes = "multipart/form-data")
    public Map<String, Object> importData(@RequestParam("file") MultipartFile file) throws IOException {
        String json = new String(file.getBytes(), StandardCharsets.UTF_8);
        Map<String, Object> payload = objectMapper.readValue(json, new TypeReference<>() {});

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("categories",   importCategories(payload));
        result.put("inventory",    importInventory(payload));
        result.put("sales",        importSales(payload));
        result.put("payments",     importPayments(payload));
        result.put("activityLogs", importActivityLogs(payload));
        return result;
    }

    @SuppressWarnings("unchecked")
    private int importSales(Map<String, Object> payload) {
        List<Map<String, Object>> list = (List<Map<String, Object>>) payload.get("sales");
        if (list == null) return 0;
        int count = 0;
        for (Map<String, Object> m : list) {
            Map<String, Object> copy = new HashMap<>(m);
            copy.remove("id");
            SalesLoan s = objectMapper.convertValue(copy, SalesLoan.class);
            s.setStoreId(sid());
            salesRepo.save(s);
            count++;
        }
        return count;
    }

    @SuppressWarnings("unchecked")
    private int importInventory(Map<String, Object> payload) {
        List<Map<String, Object>> list = (List<Map<String, Object>>) payload.get("inventory");
        if (list == null) return 0;
        int count = 0;
        for (Map<String, Object> m : list) {
            Map<String, Object> copy = new HashMap<>(m);
            copy.remove("id");
            InventoryItem item = objectMapper.convertValue(copy, InventoryItem.class);
            item.setStoreId(sid());
            inventoryRepo.save(item);
            count++;
        }
        return count;
    }

    @SuppressWarnings("unchecked")
    private int importCategories(Map<String, Object> payload) {
        List<Map<String, Object>> list = (List<Map<String, Object>>) payload.get("categories");
        if (list == null) return 0;
        int count = 0;
        for (Map<String, Object> m : list) {
            String name = (String) m.get("name");
            if (name == null || name.isEmpty()) continue;
            if (!categoryRepo.existsByNameAndStoreId(name, sid())) {
                categoryRepo.save(new Category(name, sid()));
                count++;
            }
        }
        return count;
    }

    @SuppressWarnings("unchecked")
    private int importPayments(Map<String, Object> payload) {
        List<Map<String, Object>> list = (List<Map<String, Object>>) payload.get("payments");
        if (list == null) return 0;
        int count = 0;
        for (Map<String, Object> m : list) {
            Map<String, Object> copy = new HashMap<>(m);
            copy.remove("id");
            Payment p = objectMapper.convertValue(copy, Payment.class);
            p.setStoreId(sid());
            paymentRepo.save(p);
            count++;
        }
        return count;
    }

    @SuppressWarnings("unchecked")
    private int importActivityLogs(Map<String, Object> payload) {
        List<Map<String, Object>> list = (List<Map<String, Object>>) payload.get("activityLogs");
        if (list == null) return 0;
        int count = 0;
        for (Map<String, Object> m : list) {
            Map<String, Object> copy = new HashMap<>(m);
            copy.remove("id");
            ActivityLog log = objectMapper.convertValue(copy, ActivityLog.class);
            log.setStoreId(sid());
            activityRepo.save(log);
            count++;
        }
        return count;
    }
}
