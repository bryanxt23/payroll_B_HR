package com.payroll.backend.calendar;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "calendar_events")
public class CalendarEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    private String startTime;
    private String endTime;

    @Column(nullable = false)
    private String eventType; // Leave, Holiday, Training, Meeting, Store Event, Overtime, Birthday, Other

    @Column(columnDefinition = "boolean default false not null")
    private Boolean affectsSalary = false;

    private String notes;

    // Comma-separated employee codes for attendees
    private String attendees;

    /** Employee code of the creator. Null = created by Admin (visible to all). */
    @Column(name = "created_by")
    private String createdBy;

    public CalendarEvent() {}

    public Long getId() { return id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }

    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getAttendees() { return attendees; }
    public void setAttendees(String attendees) { this.attendees = attendees; }

    public Boolean getAffectsSalary() { return affectsSalary != null ? affectsSalary : false; }
    public void setAffectsSalary(Boolean affectsSalary) { this.affectsSalary = affectsSalary != null ? affectsSalary : false; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
}
