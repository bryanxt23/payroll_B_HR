package com.payroll.backend.sales;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface SalesLoanRepository extends JpaRepository<SalesLoan, Long> {
    List<SalesLoan> findByStoreId(Long storeId);
    @Transactional
    void deleteByStoreId(Long storeId);
}
