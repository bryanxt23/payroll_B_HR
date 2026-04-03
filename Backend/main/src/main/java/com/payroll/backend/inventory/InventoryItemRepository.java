package com.payroll.backend.inventory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {
    List<InventoryItem> findByStoreId(Long storeId);

    @Query("SELECT i FROM InventoryItem i WHERE LOWER(TRIM(i.name)) = LOWER(TRIM(:name)) AND i.storeId = :storeId")
    Optional<InventoryItem> findByNameAndStoreId(@Param("name") String name, @Param("storeId") Long storeId);

    @Transactional
    void deleteByStoreId(Long storeId);
}
