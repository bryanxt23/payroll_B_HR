package com.payroll.backend.timesheet;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/timesheets")
public class TimesheetController {

    private final TimesheetRepository repo;

    public TimesheetController(TimesheetRepository repo) {
        this.repo = repo;
    }

    /**
     * GET /api/timesheets?employeeCode=EMP001&year=2026&month=4
     * Admin sees any employee. Non-admin can only see their own.
     */
    @GetMapping
    public List<Timesheet> list(@RequestParam String employeeCode,
                                @RequestParam int year,
                                @RequestParam int month,
                                HttpServletRequest req) {
        String role = req.getHeader("X-User-Role");
        String callerCode = req.getHeader("X-Employee-Code");

        // Non-admin can only view their own timesheet
        if (!"Admin".equals(role) && callerCode != null && !employeeCode.equals(callerCode)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        YearMonth ym = YearMonth.of(year, month);
        LocalDate from = ym.atDay(1);
        LocalDate to = ym.atEndOfMonth();
        return repo.findByEmployeeCodeAndDateBetweenOrderByDateAsc(employeeCode, from, to);
    }

    @PostMapping
    public Timesheet create(@RequestBody Timesheet body) {
        return repo.save(body);
    }

    @PutMapping("/{id}")
    public Timesheet update(@PathVariable Long id, @RequestBody Timesheet body) {
        Timesheet ts = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (body.getDate() != null) ts.setDate(body.getDate());
        if (body.getSchedStart() != null) ts.setSchedStart(body.getSchedStart());
        if (body.getSchedEnd() != null) ts.setSchedEnd(body.getSchedEnd());
        if (body.getTimeIn() != null) ts.setTimeIn(body.getTimeIn());
        if (body.getTimeOut() != null) ts.setTimeOut(body.getTimeOut());
        if (body.getBreakMinutes() != null) ts.setBreakMinutes(body.getBreakMinutes());
        if (body.getWorkedHours() != null) ts.setWorkedHours(body.getWorkedHours());
        if (body.getLateMinutes() != null) ts.setLateMinutes(body.getLateMinutes());
        if (body.getUndertimeMinutes() != null) ts.setUndertimeMinutes(body.getUndertimeMinutes());
        if (body.getOvertimeHours() != null) ts.setOvertimeHours(body.getOvertimeHours());
        if (body.getStatus() != null) ts.setStatus(body.getStatus());
        if (body.getRemarks() != null) ts.setRemarks(body.getRemarks());

        return repo.save(ts);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repo.deleteById(id);
    }
}
