package com.payroll.backend.auth;

import jakarta.persistence.*;

@Entity
@Table(name = "custom_roles")
public class CustomRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_id")
    private Long clientId;

    @Column(nullable = false)
    private String name;

    @Column(name = "can_add_sales")
    private boolean canAddSales;

    @Column(name = "can_edit_sales")
    private boolean canEditSales;

    @Column(name = "can_delete_sales")
    private boolean canDeleteSales;

    @Column(name = "can_add_inventory")
    private boolean canAddInventory;

    @Column(name = "can_edit_inventory")
    private boolean canEditInventory;

    @Column(name = "can_delete_inventory")
    private boolean canDeleteInventory;

    public Long getId() { return id; }

    public Long getClientId() { return clientId; }
    public void setClientId(Long clientId) { this.clientId = clientId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public boolean isCanAddSales() { return canAddSales; }
    public void setCanAddSales(boolean v) { this.canAddSales = v; }

    public boolean isCanEditSales() { return canEditSales; }
    public void setCanEditSales(boolean v) { this.canEditSales = v; }

    public boolean isCanDeleteSales() { return canDeleteSales; }
    public void setCanDeleteSales(boolean v) { this.canDeleteSales = v; }

    public boolean isCanAddInventory() { return canAddInventory; }
    public void setCanAddInventory(boolean v) { this.canAddInventory = v; }

    public boolean isCanEditInventory() { return canEditInventory; }
    public void setCanEditInventory(boolean v) { this.canEditInventory = v; }

    public boolean isCanDeleteInventory() { return canDeleteInventory; }
    public void setCanDeleteInventory(boolean v) { this.canDeleteInventory = v; }
}
