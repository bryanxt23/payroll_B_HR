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
        return repo.findByStoreId(sid());
    }

    @PostMapping
    public Category create(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        if (name == null || name.isBlank()) throw new RuntimeException("Name is required");
        if (repo.existsByNameAndStoreId(name.trim(), sid()))
            throw new RuntimeException("Category already exists");
        return repo.save(new Category(name.trim(), sid()));
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
