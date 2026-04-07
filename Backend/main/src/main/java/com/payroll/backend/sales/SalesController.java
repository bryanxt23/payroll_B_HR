package com.payroll.backend.sales;

import com.payroll.backend.activity.ActivityLog;
import com.payroll.backend.activity.ActivityLogRepository;
import com.payroll.backend.inventory.InventoryItemRepository;
import com.payroll.backend.payment.Payment;
import com.payroll.backend.payment.PaymentRepository;
import com.payroll.backend.store.StoreContextHolder;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/sales")
public class SalesController {

    private final SalesLoanRepository repo;
    private final ActivityLogRepository activityRepo;
    private final PaymentRepository paymentRepo;
    private final InventoryItemRepository inventoryRepo;

    public SalesController(SalesLoanRepository repo,
                           ActivityLogRepository activityRepo,
                           PaymentRepository paymentRepo,
                           InventoryItemRepository inventoryRepo) {
        this.repo          = repo;
        this.activityRepo  = activityRepo;
        this.paymentRepo   = paymentRepo;
        this.inventoryRepo = inventoryRepo;
    }

    private Long sid() { return StoreContextHolder.getStoreId(); }

    @GetMapping
    public List<SalesLoan> list() {
        return repo.findByStoreId(sid());
    }

    @PostMapping
    public SalesLoan create(@RequestBody @NonNull SalesLoan loan,
                            @RequestHeader(value = "X-Username", defaultValue = "system") String username) {
        loan.setStoreId(sid());
        if (loan.getStatus() == null) loan.setStatus("Active");
        if (loan.getPurchaseDate() == null)
            loan.setPurchaseDate(java.time.LocalDate.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("MMM d, yyyy")));
        SalesLoan saved = repo.save(loan);

        ActivityLog log = new ActivityLog();
        log.setStoreId(sid());
        log.setIcon("buyer");
        log.setEntityName(saved.getCustomerName());
        log.setAction("added as new buyer — " + saved.getItem());
        log.setUsername(username);
        log.setCategory("SALES");
        log.setActionType("Added");
        log.setTargetName(saved.getCustomerName() + " / " + saved.getItem());
        log.setDetails("Created sale, Total ₱" + fmtNum(saved.getTotalPrice())
                + ", Monthly ₱" + fmtNum(saved.getMonthlyPayment()));
        activityRepo.save(log);

        return saved;
    }

    @PutMapping("/{id}")
    public SalesLoan update(@PathVariable @NonNull Long id,
                            @RequestBody @NonNull SalesLoan updated,
                            @RequestHeader(value = "X-Username", defaultValue = "system") String username) {
        SalesLoan loan = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Loan not found: " + id));

        List<String> changes = new ArrayList<>();
        if (updated.getPaymentTerms() != null && !updated.getPaymentTerms().equals(loan.getPaymentTerms()))
            changes.add("Terms: " + loan.getPaymentTerms() + " → " + updated.getPaymentTerms());
        if (updated.getItem() != null && !updated.getItem().equals(loan.getItem()))
            changes.add("Item: " + loan.getItem() + " → " + updated.getItem());
        if (updated.getTotalPrice() != null && !Objects.equals(loan.getTotalPrice(), updated.getTotalPrice()))
            changes.add("Total Payable ₱" + fmtNum(loan.getTotalPrice()) + " → ₱" + fmtNum(updated.getTotalPrice()));
        if (updated.getMonthlyPayment() != null && !Objects.equals(loan.getMonthlyPayment(), updated.getMonthlyPayment()))
            changes.add("Monthly ₱" + fmtNum(loan.getMonthlyPayment()) + " → ₱" + fmtNum(updated.getMonthlyPayment()));
        if (updated.getRemainingBalance() != null && !Objects.equals(loan.getRemainingBalance(), updated.getRemainingBalance()))
            changes.add("Balance ₱" + fmtNum(loan.getRemainingBalance()) + " → ₱" + fmtNum(updated.getRemainingBalance()));
        if (updated.getDiscount() != null && !Objects.equals(loan.getDiscount(), updated.getDiscount()))
            changes.add("Discount ₱" + fmtNum(loan.getDiscount()) + " → ₱" + fmtNum(updated.getDiscount()));
        if (updated.getDueDate() != null && !updated.getDueDate().equals(loan.getDueDate()))
            changes.add("Due: " + loan.getDueDate() + " → " + updated.getDueDate());
        if (updated.getStatus() != null && !updated.getStatus().equals(loan.getStatus()))
            changes.add("Status: " + loan.getStatus() + " → " + updated.getStatus());
        // Always show current snapshot (terms, total payable, monthly, balance)
        Double finalTotal   = updated.getTotalPrice()       != null ? updated.getTotalPrice()       : loan.getTotalPrice();
        Double finalMonthly = updated.getMonthlyPayment()   != null ? updated.getMonthlyPayment()   : loan.getMonthlyPayment();
        Double finalBalance = updated.getRemainingBalance() != null ? updated.getRemainingBalance() : loan.getRemainingBalance();
        String finalTerms   = updated.getPaymentTerms()     != null ? updated.getPaymentTerms()     : loan.getPaymentTerms();
        String currentState = "| Total Payable: ₱" + fmtNum(finalTotal)
            + ", Monthly: ₱" + fmtNum(finalMonthly)
            + ", Balance: ₱" + fmtNum(finalBalance)
            + ", Terms: " + finalTerms;
        String details = (changes.isEmpty() ? "No field changes" : String.join(", ", changes)) + " " + currentState;

        if (updated.getCustomerName()     != null) loan.setCustomerName(updated.getCustomerName());
        if (updated.getFacebookName()     != null) loan.setFacebookName(updated.getFacebookName());
        if (updated.getMobileNumber()     != null) loan.setMobileNumber(updated.getMobileNumber());
        if (updated.getItem()             != null) loan.setItem(updated.getItem());
        if (updated.getPaymentTerms()     != null) loan.setPaymentTerms(updated.getPaymentTerms());
        if (updated.getTotalPrice()       != null) loan.setTotalPrice(updated.getTotalPrice());
        if (updated.getSubTotal()         != null) loan.setSubTotal(updated.getSubTotal());
        if (updated.getDiscount()         != null) loan.setDiscount(updated.getDiscount());
        if (updated.getDownPayment()      != null) loan.setDownPayment(updated.getDownPayment());
        if (updated.getMonthsToPay()      != null) loan.setMonthsToPay(updated.getMonthsToPay());
        if (updated.getMonthlyPayment()   != null) loan.setMonthlyPayment(updated.getMonthlyPayment());
        if (updated.getRemainingBalance() != null) loan.setRemainingBalance(updated.getRemainingBalance());
        if (updated.getProfit()           != null) loan.setProfit(updated.getProfit());
        if (updated.getDueDate()          != null) loan.setDueDate(updated.getDueDate());
        if (updated.getStatus()           != null) loan.setStatus(updated.getStatus());

        // Append edit entry to payment notes history
        {
            String dateTimeStr = java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("MMM d, yyyy h:mm a", java.util.Locale.ENGLISH));
            String summary = changes.isEmpty() ? "Record updated (no field changes)" : String.join(", ", changes);
            String entry   = "[" + dateTimeStr + "] ✏️ Edited by " + username + ": " + summary;
            String existing = loan.getPaymentNotes();
            loan.setPaymentNotes(existing != null && !existing.isBlank() ? existing + "|||" + entry : entry);
        }

        SalesLoan saved = repo.save(loan);

        ActivityLog log = new ActivityLog();
        log.setStoreId(sid());
        log.setIcon("edit");
        log.setEntityName(saved.getCustomerName());
        log.setAction("sale record updated");
        log.setUsername(username);
        log.setCategory("SALES");
        log.setActionType("Edited");
        log.setTargetName(saved.getCustomerName() + " / " + saved.getItem());
        log.setDetails(details);
        activityRepo.save(log);

        return saved;
    }

    @PutMapping("/{id}/pay")
    public SalesLoan recordPayment(@PathVariable @NonNull Long id,
                                   @RequestBody(required = false) java.util.Map<String, Object> body,
                                   @RequestHeader(value = "X-Username", defaultValue = "system") String username) {
        SalesLoan loan = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Loan not found: " + id));

        double remaining = loan.getRemainingBalance() != null ? loan.getRemainingBalance() : 0;
        double monthly   = loan.getMonthlyPayment()   != null ? loan.getMonthlyPayment()   : 0;

        // Use entered amount if provided, else default to monthly payment
        double amount = monthly;
        String notes  = null;
        if (body != null) {
            if (body.get("amount") instanceof Number n) amount = n.doubleValue();
            if (body.get("notes") instanceof String s && !s.isBlank()) notes = s.trim();
        }
        amount = Math.min(amount, remaining); // cannot overpay
        double newBalance = Math.max(0, remaining - amount);

        loan.setRemainingBalance(newBalance);

        // Track cumulative paid this month period
        double alreadyPaidThisMonth = loan.getPaidThisMonth() != null ? loan.getPaidThisMonth() : 0;
        double totalPaidThisMonth   = alreadyPaidThisMonth + amount;

        if (newBalance <= 0) {
            loan.setStatus("Paid");
            loan.setPaidThisMonth(0.0);
        } else if (totalPaidThisMonth >= monthly && monthly > 0) {
            // Full monthly payment covered — advance due date and reset counter
            String currentDue = loan.getDueDate();
            if (currentDue != null && !currentDue.isBlank()) {
                try {
                    java.time.format.DateTimeFormatter fmt =
                        java.time.format.DateTimeFormatter.ofPattern("MMM d, yyyy", java.util.Locale.ENGLISH);
                    java.time.LocalDate nextDue = java.time.LocalDate.parse(currentDue, fmt).plusMonths(1);
                    loan.setDueDate(nextDue.format(fmt));
                } catch (Exception ignored) {}
            }
            loan.setPaidThisMonth(0.0);
        } else {
            // Partial payment — accumulate and keep due date
            loan.setPaidThisMonth(totalPaidThisMonth);
        }

        // Always log the payment entry
        {
            String dateTimeStr = java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("MMM d, yyyy h:mm a", java.util.Locale.ENGLISH));
            String entry = "[" + dateTimeStr + "] 💳 Payment ₱" + String.format("%.2f", amount)
                + " by " + username
                + (notes != null ? " — " + notes : "");
            String existing = loan.getPaymentNotes();
            loan.setPaymentNotes(existing != null && !existing.isBlank() ? existing + "|||" + entry : entry);
        }

        SalesLoan saved = repo.save(loan);

        Payment payment = new Payment();
        payment.setStoreId(sid());
        payment.setAmount(amount);
        paymentRepo.save(payment);

        boolean fullPaid = newBalance <= 0;

        // Deduct 1 from inventory when fully paid
        if (fullPaid && saved.getItem() != null) {
            Long storeId = sid();
            System.out.print("ASFASJKFASDasdasd");
            inventoryRepo.findByNameAndStoreId(saved.getItem().trim(), storeId)
                    .ifPresent(invItem -> {
                        int newQty = Math.max(0, (invItem.getQuantity() != null ? invItem.getQuantity() : 0) - 1);
                        invItem.setQuantity(newQty);
                        if (newQty == 0) invItem.setStatus("Out of Stock");
                        inventoryRepo.save(invItem);

                        ActivityLog invLog = new ActivityLog();
                        invLog.setStoreId(storeId);
                        invLog.setIcon("inventory");
                        invLog.setEntityName(invItem.getName());
                        invLog.setAction("stock deducted — sold to " + saved.getCustomerName());
                        invLog.setUsername(username);
                        invLog.setCategory("INVENTORY");
                        invLog.setActionType("Stock Update");
                        invLog.setTargetName(invItem.getName());
                        invLog.setDetails("Qty reduced to " + newQty + (newQty == 0 ? " — Out of Stock" : ""));
                        activityRepo.save(invLog);
                    });
        }

        ActivityLog log = new ActivityLog();
        log.setStoreId(sid());
        log.setIcon("payment");
        log.setEntityName(saved.getCustomerName());
        log.setAction("made a payment ₱" + String.format("%.0f", amount)
                + (fullPaid ? " — Fully Paid!" : ""));
        log.setUsername(username);
        log.setCategory("SALES");
        log.setActionType("Paid");
        log.setTargetName(saved.getCustomerName() + " / " + saved.getItem());
        log.setDetails("Payment ₱" + fmtNum(amount)
                + (fullPaid ? " — Fully Paid!" : ", Remaining ₱" + fmtNum(newBalance))
                + (notes != null ? " | Note: " + notes : ""));
        activityRepo.save(log);

        return saved;
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable @NonNull Long id,
                       @RequestHeader(value = "X-Username", defaultValue = "system") String username) {
        SalesLoan loan = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Loan not found: " + id));

        ActivityLog log = new ActivityLog();
        log.setStoreId(sid());
        log.setIcon("edit");
        log.setEntityName(loan.getCustomerName());
        log.setAction("sale record removed");
        log.setUsername(username);
        log.setCategory("SALES");
        log.setActionType("Deleted");
        log.setTargetName(loan.getCustomerName() + " / " + loan.getItem());
        log.setDetails("Removed sale record");
        activityRepo.save(log);

        repo.deleteById(id);
    }

    private String fmtNum(Double n) { return n == null ? "0" : String.format("%.0f", n); }
}
