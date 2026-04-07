package com.payroll.backend.calendar;

import com.payroll.backend.employee.Employee;
import com.payroll.backend.employee.EmployeeRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/calendar")
public class CalendarController {

    private final CalendarEventRepository eventRepo;
    private final EmployeeRepository employeeRepo;

    public CalendarController(CalendarEventRepository eventRepo,
                              EmployeeRepository employeeRepo) {
        this.eventRepo = eventRepo;
        this.employeeRepo = employeeRepo;
    }

    /**
     * Visibility rules:
     * - If ?employeeCode= is passed (salary page): return admin events + that employee's events
     * - Admin (no employeeCode filter): sees ALL events
     * - Employee (no employeeCode filter): sees admin events + their own events
     */
    @GetMapping("/events")
    public List<CalendarEvent> getEvents(@RequestParam Integer year,
                                          @RequestParam Integer month,
                                          @RequestParam(required = false) String employeeCode,
                                          HttpServletRequest req) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();
        List<CalendarEvent> all = eventRepo.findEventsInRange(start, end);

        // Salary page passes employeeCode — show admin events + that employee's events
        if (employeeCode != null && !employeeCode.isBlank()) {
            return all.stream().filter(ev ->
                ev.getCreatedBy() == null || ev.getCreatedBy().isBlank()
                || ev.getCreatedBy().equals(employeeCode)
            ).collect(Collectors.toList());
        }

        // Calendar page — admin sees all, employee sees admin + own
        String role = req.getHeader("X-User-Role");
        if ("Admin".equals(role)) return all;

        String headerEmpCode = req.getHeader("X-Employee-Code");
        return all.stream().filter(ev ->
            ev.getCreatedBy() == null || ev.getCreatedBy().isBlank()
            || ev.getCreatedBy().equals(headerEmpCode)
        ).collect(Collectors.toList());
    }

    @GetMapping("/events/{id}")
    public CalendarEvent getEvent(@PathVariable Long id) {
        return eventRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found: " + id));
    }

    @GetMapping("/events/{id}/attendees")
    public List<Map<String, String>> getAttendees(@PathVariable Long id) {
        CalendarEvent event = eventRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found: " + id));
        if (event.getAttendees() == null || event.getAttendees().isBlank()) {
            return Collections.emptyList();
        }
        String[] codes = event.getAttendees().split(",");
        List<Map<String, String>> result = new ArrayList<>();
        for (String code : codes) {
            String trimmed = code.trim();
            if (trimmed.isEmpty()) continue;
            Optional<Employee> emp = employeeRepo.findByCode(trimmed);
            Map<String, String> m = new HashMap<>();
            m.put("code", trimmed);
            m.put("name", emp.map(Employee::getName).orElse(trimmed));
            m.put("photoUrl", emp.map(Employee::getPhotoUrl).orElse(null));
            result.add(m);
        }
        return result;
    }

    @PostMapping("/events")
    public CalendarEvent createEvent(@RequestBody CalendarEvent event, HttpServletRequest req) {
        String role = req.getHeader("X-User-Role");
        if ("Admin".equals(role)) {
            event.setCreatedBy(null); // Admin events visible to all
        } else {
            String empCode = req.getHeader("X-Employee-Code");
            event.setCreatedBy(empCode); // Employee events visible only to them + admin
        }
        return eventRepo.save(event);
    }

    @PutMapping("/events/{id}")
    public CalendarEvent updateEvent(@PathVariable Long id, @RequestBody CalendarEvent body,
                                     HttpServletRequest req) {
        CalendarEvent event = eventRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found: " + id));

        String role = req.getHeader("X-User-Role");
        if (!"Admin".equals(role)) {
            String empCode = req.getHeader("X-Employee-Code");
            if (event.getCreatedBy() == null || !event.getCreatedBy().equals(empCode)) {
                throw new RuntimeException("You can only edit your own events.");
            }
        }
        if (body.getTitle() != null) event.setTitle(body.getTitle());
        if (body.getStartDate() != null) event.setStartDate(body.getStartDate());
        if (body.getEndDate() != null) event.setEndDate(body.getEndDate());
        if (body.getStartTime() != null) event.setStartTime(body.getStartTime());
        if (body.getEndTime() != null) event.setEndTime(body.getEndTime());
        if (body.getEventType() != null) event.setEventType(body.getEventType());
        if (body.getNotes() != null) event.setNotes(body.getNotes());
        if (body.getAttendees() != null) event.setAttendees(body.getAttendees());
        event.setAffectsSalary(body.getAffectsSalary());
        return eventRepo.save(event);
    }

    @DeleteMapping("/events/{id}")
    public void deleteEvent(@PathVariable Long id, HttpServletRequest req) {
        String role = req.getHeader("X-User-Role");
        if (!"Admin".equals(role)) {
            CalendarEvent event = eventRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Event not found: " + id));
            String empCode = req.getHeader("X-Employee-Code");
            if (event.getCreatedBy() == null || !event.getCreatedBy().equals(empCode)) {
                throw new RuntimeException("You can only delete your own events.");
            }
        }
        eventRepo.deleteById(id);
    }

    @GetMapping("/employees")
    public List<Map<String, String>> listEmployees() {
        return employeeRepo.findAll().stream().map(e -> {
            Map<String, String> m = new HashMap<>();
            m.put("code", e.getCode());
            m.put("name", e.getName());
            m.put("photoUrl", e.getPhotoUrl());
            return m;
        }).collect(Collectors.toList());
    }
}
