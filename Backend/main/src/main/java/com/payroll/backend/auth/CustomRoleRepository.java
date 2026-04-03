package com.payroll.backend.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CustomRoleRepository extends JpaRepository<CustomRole, Long> {
    Optional<CustomRole> findByName(String name);
    List<CustomRole> findByClientId(Long clientId);
    boolean existsByName(String name);
}
