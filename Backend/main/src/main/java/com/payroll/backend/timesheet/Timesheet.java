package com.payroll.backend.timesheet;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "timesheets")
public class Timesheet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Employee code (links to employees.code) */
    @Column(name = "employee_code", nullable = false)
    private String employeeCode;

    @Column(nullable = false)
    private LocalDate date;

    /** Scheduled start/end (e.g. 8:00 AM – 5:00 PM) */
    @Column(name = "sched_start")
    private LocalTime schedStart;

    @Column(name = "sched_end")
    private LocalTime schedEnd;

    /** Actual clock in/out */
    @Column(name = "time_in")
    private LocalTime timeIn;

    @Column(name = "time_out")
    private LocalTime timeOut;

    /** Break duration in minutes */
    @Column(name = "break_minutes")
    private Integer breakMinutes;

    /** Computed hours worked (decimal) */
    @Column(name = "worked_hours")
    private Double workedHours;

    /** Late in minutes */
    @Column(name = "late_minutes")
    private Integer lateMinutes;

    /** Undertime in minutes */
    @Column(name = "undertime_minutes")
    private Integer undertimeMinutes;

    /** Overtime in hours (decimal) */
    @Column(name = "overtime_hours")
    private Double overtimeHours;

    /** e.g. "Present", "Absent", "Leave", "Holiday" */
    private String status;

    private String remarks;

    // ── Getters / Setters ──

    public Long getId() { return id; }

    public String getEmployeeCode() { return employeeCode; }
    public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public LocalTime getSchedStart() { return schedStart; }
    public void setSchedStart(LocalTime schedStart) { this.schedStart = schedStart; }

    public LocalTime getSchedEnd() { return schedEnd; }
    public void setSchedEnd(LocalTime schedEnd) { this.schedEnd = schedEnd; }

    public LocalTime getTimeIn() { return timeIn; }
    public void setTimeIn(LocalTime timeIn) { this.timeIn = timeIn; }

    public LocalTime getTimeOut() { return timeOut; }
    public void setTimeOut(LocalTime timeOut) { this.timeOut = timeOut; }

    public Integer getBreakMinutes() { return breakMinutes; }
    public void setBreakMinutes(Integer breakMinutes) { this.breakMinutes = breakMinutes; }

    public Double getWorkedHours() { return workedHours; }
    public void setWorkedHours(Double workedHours) { this.workedHours = workedHours; }

    public Integer getLateMinutes() { return lateMinutes; }
    public void setLateMinutes(Integer lateMinutes) { this.lateMinutes = lateMinutes; }

    public Integer getUndertimeMinutes() { return undertimeMinutes; }
    public void setUndertimeMinutes(Integer undertimeMinutes) { this.undertimeMinutes = undertimeMinutes; }

    public Double getOvertimeHours() { return overtimeHours; }
    public void setOvertimeHours(Double overtimeHours) { this.overtimeHours = overtimeHours; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}
