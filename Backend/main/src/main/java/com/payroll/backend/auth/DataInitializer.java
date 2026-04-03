package com.payroll.backend.auth;

import com.payroll.backend.store.Store;
import com.payroll.backend.store.StoreRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final AppUserRepository userRepo;
    private final StoreRepository storeRepo;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public DataInitializer(AppUserRepository userRepo, StoreRepository storeRepo) {
        this.userRepo  = userRepo;
        this.storeRepo = storeRepo;
    }

    @Override
    public void run(String... args) {
        // Migrate old "ADMIN" role to "Admin"
        userRepo.findByUsername("admin").ifPresent(existing -> {
            if ("ADMIN".equals(existing.getRole())) {
                existing.setRole("Admin");
                userRepo.save(existing);
            }
        });

        // Create default admin if not present
        if (!userRepo.existsByUsername("admin")) {
            AppUser admin = new AppUser();
            admin.setUsername("admin");
            admin.setEmail("admin@mrstyles.com");
            admin.setPassword(encoder.encode("root"));
            admin.setRole("Admin");
            userRepo.save(admin);
            System.out.println("✅ Admin user created: admin / root");
        }

        // Seed the default store if none exists
        if (storeRepo.count() == 0) {
            storeRepo.save(new Store("MR Styles Main"));
            System.out.println("✅ Default store seeded: MR Styles Main (id=1)");
        }
    }
}
