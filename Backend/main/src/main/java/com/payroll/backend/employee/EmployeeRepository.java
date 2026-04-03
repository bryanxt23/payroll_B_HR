package com.payroll.backend.employee;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

//import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    java.util.Optional<Employee> findByCode(String code);
    Page<Employee> findAll(Pageable pageable);
}
