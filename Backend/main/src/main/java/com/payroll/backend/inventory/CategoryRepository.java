package com.payroll.backend.inventory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByStoreId(Long storeId);
    boolean existsByNameAndStoreId(String name, Long storeId);
    @Transactional
    void deleteByStoreId(Long storeId);
}
