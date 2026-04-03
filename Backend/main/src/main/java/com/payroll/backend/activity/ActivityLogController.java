package com.payroll.backend.activity;

import com.payroll.backend.store.StoreContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/activity")
public class ActivityLogController {

    private final ActivityLogRepository repo;

    public ActivityLogController(ActivityLogRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<ActivityLog> recent() {
        return repo.findTop20ByStoreIdOrderByCreatedAtDesc(StoreContextHolder.getStoreId());
    }

    @GetMapping("/report")
    public List<ActivityLog> report(@RequestParam(required = false) String category) {
        Long sid = StoreContextHolder.getStoreId();
        if (category != null && !category.isEmpty())
            return repo.findByStoreIdAndCategoryOrderByCreatedAtDesc(sid, category);
        return repo.findAllByStoreIdOrderByCreatedAtDesc(sid);
    }
}
