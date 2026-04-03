package com.payroll.backend.activity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByStoreId(Long storeId);
    List<ActivityLog> findTop20ByStoreIdOrderByCreatedAtDesc(Long storeId);
    List<ActivityLog> findAllByStoreIdOrderByCreatedAtDesc(Long storeId);
    List<ActivityLog> findByStoreIdAndCategoryOrderByCreatedAtDesc(Long storeId, String category);
    @Transactional
    void deleteByStoreId(Long storeId);
}
