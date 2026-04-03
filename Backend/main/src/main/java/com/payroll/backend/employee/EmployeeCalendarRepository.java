package com.payroll.backend.employee;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EmployeeCalendarRepository extends JpaRepository<EmployeeCalendar, Long> {
    List<EmployeeCalendar> findByEmployeeIdAndYearAndMonthOrderByDayAsc(Long employeeId, Integer year, Integer month);
}
