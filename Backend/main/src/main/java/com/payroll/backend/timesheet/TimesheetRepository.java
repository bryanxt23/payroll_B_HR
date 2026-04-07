package com.payroll.backend.timesheet;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface TimesheetRepository extends JpaRepository<Timesheet, Long> {
    List<Timesheet> findByEmployeeCodeAndDateBetweenOrderByDateAsc(
            String employeeCode, LocalDate from, LocalDate to);

    List<Timesheet> findByDateBetweenOrderByDateAsc(LocalDate from, LocalDate to);
}
