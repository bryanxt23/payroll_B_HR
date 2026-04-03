package com.payroll.backend.payment;

import com.payroll.backend.store.StoreContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentStatsController {

    private final PaymentRepository repo;

    public PaymentStatsController(PaymentRepository repo) {
        this.repo = repo;
    }

    @GetMapping("/stats")
    public Map<String, Double> stats() {
        Long storeId = StoreContextHolder.getStoreId();
        LocalDate today = LocalDate.now();

        LocalDateTime dayStart   = today.atStartOfDay();
        LocalDateTime dayEnd     = today.plusDays(1).atStartOfDay();
        LocalDateTime monthStart = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime yearStart  = today.withDayOfYear(1).atStartOfDay();

        return Map.of(
            "thisDay",   repo.sumByDateRange(storeId, dayStart,   dayEnd),
            "thisMonth", repo.sumByDateRange(storeId, monthStart, dayEnd),
            "thisYear",  repo.sumByDateRange(storeId, yearStart,  dayEnd)
        );
    }
}
