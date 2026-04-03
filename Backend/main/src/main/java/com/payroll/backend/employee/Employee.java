package com.payroll.backend.employee;

import jakarta.persistence.*;

@Entity
@Table(name = "employees")
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    private String role;

    // this is the left-side progress percentage in your UI (0-100)
    private Integer pct;

    // --- constructors ---
    public Employee() {}

    public Employee(String code, String name, String role, Integer pct) {
        this.code = code;
        this.name = name;
        this.role = role;
        this.pct = pct;
    }

    // --- getters/setters ---
    public Long getId() { return id; }

    public String getCode() { return code; }
    public String getName() { return name; }
    public String getRole() { return role; }
    public Integer getPct() { return pct; }


    public void setCode(String code) { this.code = code; }
    public void setName(String name) { this.name = name; }
    public void setRole(String role) { this.role = role; }
    public void setPct(Integer pct) { this.pct = pct; }
}