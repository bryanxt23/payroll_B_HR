package com.payroll.backend.employee;

import com.payroll.backend.inventory.CloudinaryService;
import com.payroll.backend.inventory.S3Service;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {
    private final EmployeeRepository repo;
    private final EmployeeProfileRepository profileRepo;
    private final EmployeeDocumentRepository documentRepo;
    private final EmployeeStatRepository statRepo;
    private final EmployeeCalendarRepository calendarRepo;
    private final CloudinaryService cloudinary;
    private final S3Service s3;

    public EmployeeController(EmployeeRepository repo,
                              EmployeeProfileRepository profileRepo,
                              EmployeeDocumentRepository docRepo,
                              EmployeeStatRepository statRepo,
                              EmployeeCalendarRepository calendarRepo,
                              CloudinaryService cloudinary,
                              S3Service s3) {
        this.repo = repo;
        this.profileRepo = profileRepo;
        this.documentRepo = docRepo;
        this.statRepo = statRepo;
        this.calendarRepo = calendarRepo;
        this.cloudinary = cloudinary;
        this.s3 = s3;
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
        return calendarRepo.findByEmployeeIdAndYearAndMonthOrderByDayAsc(emp.getId(), year, month);
    }

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

    /** Profile photo — still uses Cloudinary */
    @PostMapping(value = "/{code}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Employee uploadPhoto(@PathVariable String code,
                                @RequestParam("file") MultipartFile file) throws java.io.IOException {
        Employee emp = getByCode(code);
        String url = cloudinary.uploadWithPublicId(file, "payroll_B_HR_1/" + code + "/Profile", "photo");
        emp.setPhotoUrl(url);
        return repo.save(emp);
    }

    /** Documents — stored in AWS S3 */
    @PostMapping(value = "/{code}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public EmployeeDocument uploadDocument(@PathVariable String code,
                                           @RequestParam("file") MultipartFile file,
                                           @RequestParam("name") String name,
                                           @RequestParam("type") String type,
                                           @RequestParam("tag") String tag) throws java.io.IOException {
        Employee emp = getByCode(code);
        String safeName = name.toLowerCase().replaceAll("\\s+", "_") + ".pdf";
        // S3 key: employees/{code}/documents/{name}
        String s3Key = "employees/" + code + "/documents/" + safeName;
        s3.upload(file, s3Key);

        long bytes = file.getSize();
        String size = bytes >= 1_048_576
                ? String.format("%.0f mb", bytes / 1_048_576.0)
                : String.format("%.0f kb", bytes / 1_024.0);

        // Upsert: update existing document row with same name, or insert new
        EmployeeDocument doc = documentRepo.findByEmployeeIdOrderByIdAsc(emp.getId())
                .stream().filter(d -> name.equalsIgnoreCase(d.getName())).findFirst()
                .orElseGet(() -> { EmployeeDocument d = new EmployeeDocument(); d.setEmployeeId(emp.getId()); return d; });
        doc.setName(name);
        doc.setType(type);
        doc.setTag(tag);
        doc.setSize(size);
        doc.setUrl(s3Key);  // store S3 key, not a URL
        return documentRepo.save(doc);
    }

    @DeleteMapping("/{code}/documents/{docId}")
    public void deleteDocument(@PathVariable String code, @PathVariable Long docId) {
        documentRepo.deleteById(docId);
    }

    /** Download document from S3 and stream bytes to client */
    @GetMapping("/{code}/documents/{docId}/download")
    public ResponseEntity<byte[]> downloadDocument(@PathVariable String code,
                                                   @PathVariable Long docId) {
        EmployeeDocument doc = documentRepo.findById(docId)
                .orElseThrow(() -> new RuntimeException("Document not found: " + docId));

        byte[] bytes = s3.download(doc.getUrl());

        String filename = doc.getName().toLowerCase().replaceAll("\\s+", "_") + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(bytes);
    }
}
