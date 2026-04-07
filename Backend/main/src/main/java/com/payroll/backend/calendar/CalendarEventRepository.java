package com.payroll.backend.calendar;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, Long> {

    @Query("SELECT e FROM CalendarEvent e WHERE e.startDate <= :endDate AND e.endDate >= :startDate ORDER BY e.startDate ASC")
    List<CalendarEvent> findEventsInRange(@Param("startDate") LocalDate startDate,
                                          @Param("endDate") LocalDate endDate);
}
