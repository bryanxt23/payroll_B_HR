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

    private Integer quantity;

    @Column(name = "payment_terms")
    private String paymentTerms;

    @Column(name = "sub_total")
    private Double subTotal;

    private Double discount;

    @Column(name = "down_payment")
    private Double downPayment;

    private Double profit;

    @Column(name = "payment_notes", columnDefinition = "TEXT")
    private String paymentNotes;

    @Column(name = "paid_this_month")
    private Double paidThisMonth;

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

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getPaymentTerms() { return paymentTerms; }
    public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }

    public Double getSubTotal() { return subTotal; }
    public void setSubTotal(Double subTotal) { this.subTotal = subTotal; }

    public Double getDiscount() { return discount; }
    public void setDiscount(Double discount) { this.discount = discount; }

    public Double getDownPayment() { return downPayment; }
    public void setDownPayment(Double downPayment) { this.downPayment = downPayment; }

    public Double getProfit() { return profit; }
    public void setProfit(Double profit) { this.profit = profit; }

    public String getPaymentNotes() { return paymentNotes; }
    public void setPaymentNotes(String paymentNotes) { this.paymentNotes = paymentNotes; }

    public Double getPaidThisMonth() { return paidThisMonth; }
    public void setPaidThisMonth(Double paidThisMonth) { this.paidThisMonth = paidThisMonth; }
}
