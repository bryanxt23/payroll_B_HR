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
        if (updated.getMonthlyPayment() != null && !Objects.equals(loan.getMonthlyPayment(), updated.getMonthlyPayment()))
            changes.add("Monthly ₱" + fmtNum(loan.getMonthlyPayment()) + " → ₱" + fmtNum(updated.getMonthlyPayment()));
        if (updated.getTotalPrice() != null && !Objects.equals(loan.getTotalPrice(), updated.getTotalPrice()))
            changes.add("Total ₱" + fmtNum(loan.getTotalPrice()) + " → ₱" + fmtNum(updated.getTotalPrice()));
        if (updated.getRemainingBalance() != null && !Objects.equals(loan.getRemainingBalance(), updated.getRemainingBalance()))
            changes.add("Balance ₱" + fmtNum(loan.getRemainingBalance()) + " → ₱" + fmtNum(updated.getRemainingBalance()));
        if (updated.getDueDate() != null && !updated.getDueDate().equals(loan.getDueDate()))
            changes.add("Due: " + loan.getDueDate() + " → " + updated.getDueDate());
        if (updated.getStatus() != null && !updated.getStatus().equals(loan.getStatus()))
            changes.add("Status: " + loan.getStatus() + " → " + updated.getStatus());
        if (updated.getItem() != null && !updated.getItem().equals(loan.getItem()))
            changes.add("Item: " + loan.getItem() + " → " + updated.getItem());
        String details = changes.isEmpty() ? "Sale record updated" : String.join(", ", changes);

        if (updated.getCustomerName()     != null) loan.setCustomerName(updated.getCustomerName());
        if (updated.getFacebookName()     != null) loan.setFacebookName(updated.getFacebookName());
        if (updated.getMobileNumber()     != null) loan.setMobileNumber(updated.getMobileNumber());
        if (updated.getItem()             != null) loan.setItem(updated.getItem());
        if (updated.getTotalPrice()       != null) loan.setTotalPrice(updated.getTotalPrice());
        if (updated.getMonthsToPay()      != null) loan.setMonthsToPay(updated.getMonthsToPay());
        if (updated.getMonthlyPayment()   != null) loan.setMonthlyPayment(updated.getMonthlyPayment());
        if (updated.getRemainingBalance() != null) loan.setRemainingBalance(updated.getRemainingBalance());
        if (updated.getDueDate()          != null) loan.setDueDate(updated.getDueDate());
        if (updated.getStatus()           != null) loan.setStatus(updated.getStatus());
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
                                   @RequestHeader(value = "X-Username", defaultValue = "system") String username) {
        SalesLoan loan = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Loan not found: " + id));

        double remaining  = loan.getRemainingBalance() != null ? loan.getRemainingBalance() : 0;
        double monthly    = loan.getMonthlyPayment()   != null ? loan.getMonthlyPayment()   : 0;
        double newBalance = Math.max(0, remaining - monthly);

        loan.setRemainingBalance(newBalance);
        if (newBalance <= 0) loan.setStatus("Paid");
        SalesLoan saved = repo.save(loan);

        Payment payment = new Payment();
        payment.setStoreId(sid());
        payment.setAmount(monthly);
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
        log.setAction("made a payment ₱" + String.format("%.0f", monthly)
                + (fullPaid ? " — Fully Paid!" : ""));
        log.setUsername(username);
        log.setCategory("SALES");
        log.setActionType("Paid");
        log.setTargetName(saved.getCustomerName() + " / " + saved.getItem());
        log.setDetails("Payment ₱" + fmtNum(monthly)
                + (fullPaid ? " — Fully Paid!" : ", Remaining ₱" + fmtNum(newBalance)));
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
