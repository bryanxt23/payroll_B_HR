package com.payroll.backend.employee;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EmployeeStatRepository extends JpaRepository<EmployeeStat, Long> {
    List<EmployeeStat> findByEmployeeIdOrderByIdAsc(Long employeeId);
}
