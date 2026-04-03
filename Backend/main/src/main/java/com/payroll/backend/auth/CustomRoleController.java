package com.payroll.backend.auth;

import com.payroll.backend.store.StoreContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/roles")
public class CustomRoleController {

    private final CustomRoleRepository repo;

    public CustomRoleController(CustomRoleRepository repo) {
        this.repo = repo;
    }

    private Long cid() { return StoreContextHolder.getClientId(); }

    @GetMapping
    public List<CustomRole> list() {
        Long clientId = cid();
        if (clientId != null) return repo.findByClientId(clientId);
        return repo.findAll();
    }

    @PostMapping
    public CustomRole create(@RequestBody Map<String, Object> body) {
        String name = (String) body.getOrDefault("name", "");
        if (name.isBlank()) throw new RuntimeException("Role name is required");
        if (repo.existsByName(name)) throw new RuntimeException("Role name already exists");

        CustomRole role = new CustomRole();
        role.setClientId(cid());
        role.setName(name);
        role.setCanAddSales(Boolean.TRUE.equals(body.get("canAddSales")));
        role.setCanEditSales(Boolean.TRUE.equals(body.get("canEditSales")));
        role.setCanDeleteSales(Boolean.TRUE.equals(body.get("canDeleteSales")));
        role.setCanAddInventory(Boolean.TRUE.equals(body.get("canAddInventory")));
        role.setCanEditInventory(Boolean.TRUE.equals(body.get("canEditInventory")));
        role.setCanDeleteInventory(Boolean.TRUE.equals(body.get("canDeleteInventory")));
        return repo.save(role);
    }

    @PutMapping("/{id}")
    public CustomRole update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        CustomRole role = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Role not found"));
        if (body.containsKey("name")) role.setName((String) body.get("name"));
        if (body.containsKey("canAddSales"))       role.setCanAddSales(Boolean.TRUE.equals(body.get("canAddSales")));
        if (body.containsKey("canEditSales"))      role.setCanEditSales(Boolean.TRUE.equals(body.get("canEditSales")));
        if (body.containsKey("canDeleteSales"))    role.setCanDeleteSales(Boolean.TRUE.equals(body.get("canDeleteSales")));
        if (body.containsKey("canAddInventory"))   role.setCanAddInventory(Boolean.TRUE.equals(body.get("canAddInventory")));
        if (body.containsKey("canEditInventory"))  role.setCanEditInventory(Boolean.TRUE.equals(body.get("canEditInventory")));
        if (body.containsKey("canDeleteInventory"))role.setCanDeleteInventory(Boolean.TRUE.equals(body.get("canDeleteInventory")));
        return repo.save(role);
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(@PathVariable Long id) {
        repo.deleteById(id);
        return Map.of("status", "deleted");
    }
}
