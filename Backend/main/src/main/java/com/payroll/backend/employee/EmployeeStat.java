package com.payroll.backend.employee;

import jakarta.persistence.*;

@Entity
@Table(name = "employee_stats")
public class EmployeeStat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    // DB columns: Label, value, fill, theme
    private String label;
    private String value;

    private Integer fill; // fill is numeric in your SQL output
    private String theme;

    // ---- getters/setters ------

    public Long getId() { return id; }

    public Long getEmployeeId() { return employeeId; }
    public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public Integer getFill() { return fill; }
    public void setFill(Integer fill) { this.fill = fill; }

    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
}
