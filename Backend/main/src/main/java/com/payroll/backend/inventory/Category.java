package com.payroll.backend.inventory;

import jakarta.persistence.*;

@Entity
@Table(name = "inventory_categories")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id")
    private Long storeId;

    private String name;

    public Category() {}
    public Category(String name, Long storeId) {
        this.name    = name;
        this.storeId = storeId;
    }

    public Long getId() { return id; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
