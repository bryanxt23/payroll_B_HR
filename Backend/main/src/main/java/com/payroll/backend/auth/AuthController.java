package com.payroll.backend.auth;

import com.payroll.backend.employee.Employee;
import com.payroll.backend.employee.EmployeeRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AppUserRepository    userRepo;
    private final CustomRoleRepository roleRepo;
    private final EmployeeRepository   employeeRepo;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthController(AppUserRepository userRepo, CustomRoleRepository roleRepo,
                          EmployeeRepository employeeRepo) {
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.employeeRepo = employeeRepo;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        AppUser user = userRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (!encoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        String role    = user.getRole();
        boolean isAdmin = "Admin".equals(role);

        Map<String, Object> permissions = new HashMap<>();
        permissions.put("isAdmin", isAdmin);

        if (isAdmin) {
            permissions.put("canAddSales",        true);
            permissions.put("canEditSales",       true);
            permissions.put("canDeleteSales",     true);
            permissions.put("canAddInventory",    true);
            permissions.put("canEditInventory",   true);
            permissions.put("canDeleteInventory", true);
        } else if ("user".equals(role)) {
            permissions.put("canAddSales",        false);
            permissions.put("canEditSales",       false);
            permissions.put("canDeleteSales",     false);
            permissions.put("canAddInventory",    false);
            permissions.put("canEditInventory",   false);
            permissions.put("canDeleteInventory", false);
        } else if ("userS".equals(role)) {
            permissions.put("canAddSales",        true);
            permissions.put("canEditSales",       true);
            permissions.put("canDeleteSales",     false);
            permissions.put("canAddInventory",    false);
            permissions.put("canEditInventory",   false);
            permissions.put("canDeleteInventory", false);
        } else if ("userI".equals(role)) {
            permissions.put("canAddSales",        false);
            permissions.put("canEditSales",       false);
            permissions.put("canDeleteSales",     false);
            permissions.put("canAddInventory",    true);
            permissions.put("canEditInventory",   true);
            permissions.put("canDeleteInventory", false);
        } else if ("userSI".equals(role)) {
            permissions.put("canAddSales",        true);
            permissions.put("canEditSales",       true);
            permissions.put("canDeleteSales",     false);
            permissions.put("canAddInventory",    true);
            permissions.put("canEditInventory",   true);
            permissions.put("canDeleteInventory", false);
        } else {
            Optional<CustomRole> customRole = roleRepo.findByName(role);
            if (customRole.isPresent()) {
                CustomRole cr = customRole.get();
                permissions.put("canAddSales",        cr.isCanAddSales());
                permissions.put("canEditSales",       cr.isCanEditSales());
                permissions.put("canDeleteSales",     cr.isCanDeleteSales());
                permissions.put("canAddInventory",    cr.isCanAddInventory());
                permissions.put("canEditInventory",   cr.isCanEditInventory());
                permissions.put("canDeleteInventory", cr.isCanDeleteInventory());
            } else {
                permissions.put("canAddSales",        false);
                permissions.put("canEditSales",       false);
                permissions.put("canDeleteSales",     false);
                permissions.put("canAddInventory",    false);
                permissions.put("canEditInventory",   false);
                permissions.put("canDeleteInventory", false);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("id",            user.getId());
        response.put("username",      user.getUsername());
        response.put("email",         user.getEmail() != null ? user.getEmail() : "");
        response.put("role",          role);
        response.put("clientId",      user.getClientId());
        response.put("allowedStores", user.getAllowedStores() != null ? user.getAllowedStores() : "");
        response.put("employeeCode", user.getEmployeeCode() != null ? user.getEmployeeCode() : "");
        response.put("permissions",   permissions);

        // Include linked employee's photo and name
        if (user.getEmployeeCode() != null && !user.getEmployeeCode().isBlank()) {
            employeeRepo.findByCode(user.getEmployeeCode()).ifPresent(emp -> {
                response.put("photoUrl", emp.getPhotoUrl() != null ? emp.getPhotoUrl() : "");
                response.put("employeeName", emp.getName() != null ? emp.getName() : "");
            });
        }

        return response;
    }
}
