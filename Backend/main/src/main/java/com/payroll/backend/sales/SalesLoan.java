package com.payroll.backend.sales;

import jakarta.persistence.*;

@Entity
@Table(name = "sales_loans")
public class SalesLoan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id")
    private Long storeId;

    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "facebook_name")
    private String facebookName;

    @Column(name = "mobile_number")
    private String mobileNumber;

    private String item;

    @Column(name = "total_price")
    private Double totalPrice;

    @Column(name = "months_to_pay")
    private Integer monthsToPay;

    @Column(name = "monthly_payment")
    private Double monthlyPayment;

    @Column(name = "remaining_balance")
    private Double remainingBalance;

    @Column(name = "due_date")
    private String dueDate;

    @Column(name = "purchase_date")
    private String purchaseDate;

    @Column(name = "status")
    private String status = "Active";

    public Long getId() { return id; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getFacebookName() { return facebookName; }
    public void setFacebookName(String facebookName) { this.facebookName = facebookName; }

    public String getMobileNumber() { return mobileNumber; }
    public void setMobileNumber(String mobileNumber) { this.mobileNumber = mobileNumber; }

    public String getItem() { return item; }
    public void setItem(String item) { this.item = item; }

    public Double getTotalPrice() { return totalPrice; }
    public void setTotalPrice(Double totalPrice) { this.totalPrice = totalPrice; }

    public Integer getMonthsToPay() { return monthsToPay; }
    public void setMonthsToPay(Integer monthsToPay) { this.monthsToPay = monthsToPay; }

    public Double getMonthlyPayment() { return monthlyPayment; }
    public void setMonthlyPayment(Double monthlyPayment) { this.monthlyPayment = monthlyPayment; }

    public Double getRemainingBalance() { return remainingBalance; }
    public void setRemainingBalance(Double remainingBalance) { this.remainingBalance = remainingBalance; }

    public String getDueDate() { return dueDate; }
    public void setDueDate(String dueDate) { this.dueDate = dueDate; }

    public String getPurchaseDate() { return purchaseDate; }
    public void setPurchaseDate(String purchaseDate) { this.purchaseDate = purchaseDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
