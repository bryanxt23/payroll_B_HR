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
                .orElseGet(() -> { EmployeeProfile p = new EmployeeProfile(); p.setEmployeeId(emp.getId()); return p; });
    }

    @PutMapping("/{code}/profile")
    public EmployeeProfile updateProfile(@PathVariable String code, @RequestBody EmployeeProfile body) {
        Employee emp = getByCode(code);
        EmployeeProfile profile = profileRepo.findByEmployeeId(emp.getId())
                .orElseGet(() -> { EmployeeProfile p = new EmployeeProfile(); p.setEmployeeId(emp.getId()); return p; });
        if (body.getBirthday()    != null) profile.setBirthday(body.getBirthday());
        if (body.getPhone()       != null) profile.setPhone(body.getPhone());
        if (body.getEmail()       != null) profile.setEmail(body.getEmail());
        if (body.getCitizenship() != null) profile.setCitizenship(body.getCitizenship());
        if (body.getCity()        != null) profile.setCity(body.getCity());
        if (body.getAddress()     != null) profile.setAddress(body.getAddress());
        return profileRepo.save(profile);
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

    @PutMapping("/{code}")
    public Employee update(@PathVariable String code, @RequestBody Employee body) {
        Employee emp = repo.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Employee not found: " + code));
        if (body.getName()       != null) emp.setName(body.getName());
        if (body.getRole()       != null) emp.setRole(body.getRole());
        if (body.getDepartment() != null) emp.setDepartment(body.getDepartment());
        if (body.getSalary()     != null) emp.setSalary(body.getSalary());
        if (body.getStatus()     != null) emp.setStatus(body.getStatus());
        if (body.getPct()        != null) emp.setPct(body.getPct());
        return repo.save(emp);
    }

    @DeleteMapping("/{code}")
    public void delete(@PathVariable String code) {
        Employee emp = repo.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Employee not found: " + code));
        repo.delete(emp);
    }
}
