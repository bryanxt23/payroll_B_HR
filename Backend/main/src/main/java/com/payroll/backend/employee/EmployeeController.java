package com.payroll.backend.employee;

import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {
    private final EmployeeRepository repo;
    private final EmployeeProfileRepository profileRepo;
    private final EmployeeDocumentRepository documentRepo;
    private final EmployeeStatRepository statRepo;
    private final EmployeeCalendarRepository calendarRepo;

    public EmployeeController(EmployeeRepository repo,
                              EmployeeProfileRepository profileRepo,
                              EmployeeDocumentRepository docRepo,
                              EmployeeStatRepository statRepo,
                              EmployeeCalendarRepository calendarRepo) {
        this.repo = repo;
        this.profileRepo = profileRepo;
        this.documentRepo = docRepo;
        this.statRepo = statRepo;
        this.calendarRepo = calendarRepo;
    }

    @GetMapping
    public List<Employee> list() {
        return repo.findAll();
    }

    // Sidebar List
    @GetMapping("/{code}")
    public Employee getByCode(@PathVariable String code) {
        return repo.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Employee not found: " + code));
    }

    @GetMapping("/{code}/profile")
    public EmployeeProfile getProfile(@PathVariable String code) {
        Employee emp = getByCode(code);
        return profileRepo.findByEmployeeId(emp.getId())
                .orElseThrow(() -> new RuntimeException("Profile not found for: " + code));
    }

    @GetMapping("/{code}/documents")
    public List<EmployeeDocument> getDocuments(@PathVariable String code) {
        Employee emp = getByCode(code);
        return documentRepo.findByEmployeeIdOrderByIdAsc(emp.getId());
    }

    @GetMapping("/{code}/stats")
    public List<EmployeeStat> getStats(@PathVariable String code) {
        Employee emp = getByCode(code);
        return statRepo.findByEmployeeIdOrderByIdAsc(emp.getId());
    }

    @GetMapping("/{code}/calendar")
    public List<EmployeeCalendar> getCalendar(
            @PathVariable String code,
            @RequestParam Integer year,
            @RequestParam Integer month) {
        Employee emp = getByCode(code);
        List<EmployeeCalendar> data = calendarRepo.findByEmployeeIdAndYearAndMonthOrderByDayAsc(
                emp.getId(), year, month
        );
        return data;
    }


//    @GetMapping
//    public Page<Employee> list(
//            @RequestParam(defaultValue = "0") int page,
//            @RequestParam(defaultValue = "5") int size
//    ){
//        return repo.findAll(PageRequest.of(page, size, Sort.by("id").ascending()));
//    }

    @PostMapping
    public Employee create(@RequestBody Employee employee) {
        return repo.save(employee);
    }
}
