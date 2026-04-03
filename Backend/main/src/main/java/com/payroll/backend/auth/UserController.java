package com.payroll.backend.auth;

import com.payroll.backend.store.StoreContextHolder;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final AppUserRepository     userRepo;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public UserController(AppUserRepository userRepo) {
        this.userRepo = userRepo;
    }

    private boolean isAdmin(HttpServletRequest req) {
        return "Admin".equals(req.getHeader("X-User-Role"));
    }

    private Map<String, Object> toMap(AppUser u) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",            u.getId());
        m.put("username",      u.getUsername());
        m.put("email",         u.getEmail() != null ? u.getEmail() : "");
        m.put("role",          u.getRole());
        m.put("allowedStores", u.getAllowedStores() != null ? u.getAllowedStores() : "");
        m.put("clientId",      u.getClientId());
        return m;
    }

    @GetMapping
    public List<Map<String, Object>> list(HttpServletRequest req) {
        if (!isAdmin(req)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        Long clientId = StoreContextHolder.getClientId();
        List<AppUser> all = (clientId != null) ? userRepo.findByClientId(clientId) : userRepo.findAll();
        return all.stream().map(this::toMap).toList();
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        if (!isAdmin(req)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);

        String username = String.valueOf(body.get("username"));
        if ("admin".equalsIgnoreCase(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username 'admin' is reserved");
        }
        if (userRepo.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }

        AppUser user = new AppUser();
        user.setUsername(username);
        user.setEmail(String.valueOf(body.getOrDefault("email", "")));
        user.setPassword(encoder.encode(String.valueOf(body.get("password"))));
        user.setRole(String.valueOf(body.getOrDefault("role", "user")));
        user.setClientId(StoreContextHolder.getClientId());

        String as = body.containsKey("allowedStores") ? String.valueOf(body.get("allowedStores")) : "";
        user.setAllowedStores(as.isBlank() ? null : as);

        return toMap(userRepo.save(user));
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable Long id,
                                      @RequestBody Map<String, Object> body,
                                      HttpServletRequest req) {
        if (!isAdmin(req)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);

        AppUser user = userRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (body.containsKey("username")) user.setUsername(String.valueOf(body.get("username")));
        if (body.containsKey("email"))    user.setEmail(String.valueOf(body.get("email")));
        if (body.containsKey("role"))     user.setRole(String.valueOf(body.get("role")));
        if (body.containsKey("password")) {
            String pw = String.valueOf(body.get("password"));
            if (!pw.isBlank()) user.setPassword(encoder.encode(pw));
        }
        if (body.containsKey("allowedStores")) {
            String as = String.valueOf(body.get("allowedStores"));
            // Admin role always gets all stores
            if ("Admin".equals(user.getRole())) {
                user.setAllowedStores(null);
            } else {
                user.setAllowedStores(as.isBlank() ? null : as);
            }
        }

        return toMap(userRepo.save(user));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, HttpServletRequest req) {
        if (!isAdmin(req)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        userRepo.deleteById(id);
    }
}
