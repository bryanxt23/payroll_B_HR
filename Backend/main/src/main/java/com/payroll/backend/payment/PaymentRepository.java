package com.payroll.backend.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByStoreId(Long storeId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p " +
           "WHERE p.storeId = :storeId AND p.paidAt >= :from AND p.paidAt < :to")
    Double sumByDateRange(@Param("storeId") Long storeId,
                          @Param("from") LocalDateTime from,
                          @Param("to") LocalDateTime to);

    @Transactional
    void deleteByStoreId(Long storeId);
}
