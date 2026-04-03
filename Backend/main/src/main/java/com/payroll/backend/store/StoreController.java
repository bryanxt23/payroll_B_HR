package com.payroll.backend.store;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stores")
public class StoreController {

    private final StoreRepository storeRepo;

    public StoreController(StoreRepository storeRepo) {
        this.storeRepo = storeRepo;
    }

    @GetMapping
    public List<Store> list() {
        return storeRepo.findAll();
    }

    @PostMapping
    public Store create(@RequestBody Map<String, String> body) {
        String name = body.getOrDefault("name", "").trim();
        if (name.isEmpty()) throw new RuntimeException("Store name is required.");
        return storeRepo.save(new Store(name));
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(@PathVariable Long id) {
        storeRepo.deleteById(id);
        return Map.of("status", "deleted");
    }
}
