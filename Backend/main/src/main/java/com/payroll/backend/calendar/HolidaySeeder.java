package com.payroll.backend.calendar;

import com.payroll.backend.employee.Employee;
import com.payroll.backend.employee.EmployeeProfile;
import com.payroll.backend.employee.EmployeeProfileRepository;
import com.payroll.backend.employee.EmployeeRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * Seeds Philippine holidays and employee birthdays as calendar events
 * for the current year on application startup.
 * Only creates events that don't already exist (checks by title + date).
 */
@Component
@Order(2) // run after DataInitializer
public class HolidaySeeder implements CommandLineRunner {

    private final CalendarEventRepository eventRepo;
    private final EmployeeRepository employeeRepo;
    private final EmployeeProfileRepository profileRepo;

    public HolidaySeeder(CalendarEventRepository eventRepo,
                         EmployeeRepository employeeRepo,
                         EmployeeProfileRepository profileRepo) {
        this.eventRepo = eventRepo;
        this.employeeRepo = employeeRepo;
        this.profileRepo = profileRepo;
    }

    @Override
    public void run(String... args) {
        int year = LocalDate.now().getYear();
        seedHolidays(year);
        seedBirthdays(year);
    }

    private void seedHolidays(int year) {
        // Philippine Regular Holidays
        seedOne(year, 1,  1, "New Year's Day");
        seedOne(year, 4,  9, "Araw ng Kagitingan");
        seedOne(year, 5,  1, "Labor Day");
        seedOne(year, 6, 12, "Independence Day");
        seedOne(year, 8, 21, "Ninoy Aquino Day");
        seedOne(year, 8, 25, "National Heroes Day");
        seedOne(year, 11, 30, "Bonifacio Day");
        seedOne(year, 12, 25, "Christmas Day");
        seedOne(year, 12, 30, "Rizal Day");
        seedOne(year, 12, 31, "New Year's Eve");

        // Philippine Special Non-Working Holidays
        seedOne(year, 2, 25, "EDSA Revolution Anniversary");
        seedOne(year, 11,  1, "All Saints' Day");
        seedOne(year, 11,  2, "All Souls' Day");
        seedOne(year, 12, 24, "Christmas Eve");

        System.out.println("✅ Holidays seeded for " + year);
    }

    private void seedBirthdays(int year) {
        List<Employee> employees = employeeRepo.findAll();
        int count = 0;

        for (Employee emp : employees) {
            EmployeeProfile profile = profileRepo.findByEmployeeId(emp.getId()).orElse(null);
            if (profile == null || profile.getBirthday() == null || profile.getBirthday().isBlank()) continue;

            try {
                LocalDate bday = LocalDate.parse(profile.getBirthday());
                LocalDate thisYearBday = LocalDate.of(year, bday.getMonth(), bday.getDayOfMonth());
                String title = emp.getName() + "'s Birthday";

                if (!eventExists(title, thisYearBday)) {
                    CalendarEvent ev = new CalendarEvent();
                    ev.setTitle(title);
                    ev.setStartDate(thisYearBday);
                    ev.setEndDate(thisYearBday);
                    ev.setEventType("Birthday");
                    ev.setAffectsSalary(false);
                    ev.setCreatedBy(null); // visible to all
                    ev.setNotes("Happy Birthday, " + emp.getName() + "!");
                    eventRepo.save(ev);
                    count++;
                }
            } catch (Exception e) {
                // skip invalid birthday format
            }
        }

        if (count > 0) System.out.println("✅ " + count + " birthday event(s) seeded for " + year);
    }

    private void seedOne(int year, int month, int day, String title) {
        LocalDate date = LocalDate.of(year, month, day);
        if (eventExists(title, date)) return;

        CalendarEvent ev = new CalendarEvent();
        ev.setTitle(title);
        ev.setStartDate(date);
        ev.setEndDate(date);
        ev.setEventType("Holiday");
        ev.setAffectsSalary(true);
        ev.setCreatedBy(null); // admin-level, visible to all
        eventRepo.save(ev);
    }

    private boolean eventExists(String title, LocalDate date) {
        List<CalendarEvent> existing = eventRepo.findEventsInRange(date, date);
        return existing.stream().anyMatch(e -> title.equals(e.getTitle()));
    }
}
