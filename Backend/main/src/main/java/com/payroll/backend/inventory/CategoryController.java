package com.payroll.backend.inventory;

import com.payroll.backend.store.StoreContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryRepository repo;

    public CategoryController(CategoryRepository repo) {
        this.repo = repo;
    }

    private Long sid() { return StoreContextHolder.getStoreId(); }

    @GetMapping
    public List<Category> list() {
        Long storeId = sid();
        if (storeId == null) return java.util.Collections.emptyList();
        return repo.findByStoreId(storeId);
    }

    @PostMapping
    public org.springframework.http.ResponseEntity<?> create(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        if (name == null || name.isBlank())
            return org.springframework.http.ResponseEntity.badRequest().body("Name is required");
        if (repo.existsByNameAndStoreId(name.trim(), sid()))
            return org.springframework.http.ResponseEntity.badRequest().body("Category already exists in this store");
        try {
            return org.springframework.http.ResponseEntity.ok(repo.save(new Category(name.trim(), sid())));
        } catch (Exception e) {
            return org.springframework.http.ResponseEntity.badRequest().body("Category already exists");
        }
    }

    @PutMapping("/{id}")
    public Category rename(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Category cat = repo.findById(id).orElseThrow(() -> new RuntimeException("Not found"));
        String name = body.get("name");
        if (name != null && !name.isBlank()) cat.setName(name.trim());
        return repo.save(cat);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repo.deleteById(id);
    }
}
