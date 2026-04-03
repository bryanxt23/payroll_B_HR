/*
NOTES:
  React → needed for React components
  useState → used to store values that can change
  useEffect → used to run code when something changes, like loading data from backend
  MainGrid → layout wrapper for the page
  SidebarEmployees → left side panel
  SalaryCenter → middle section
  ProfilePanel → right side panel
*/


import React, { useEffect, useState } from "react";
import MainGrid from "../../components/layout/MainGrid";
import API_BASE from "../../config";

import SidebarEmployees from "./components/SidebarEmployees";
import SalaryCenter from "./components/SalaryCenter";
import ProfilePanel from "./components/ProfilePanel";

export default function SalaryPage() {
  const PAGE_SIZE = 5;

  
  //To avoid refetching all employees every time page changes, you can fetch once, then paginate locally.
  const [allEmployees, setAllEmployees] = useState([]);

  // stores the current employee list shown in the sidebar
  // this is only the current page of employees, not all employees
  // starts as empty array []
  const [employees, setEmployees] = useState([]);

  // stores which employee is currently selected
  // this is the employee code, not the employee name
  // likely something like "EMP001"
  const [selectedCode, setSelectedCode] = useState(null);

  // stores the data for the right panel
  // starts as null because nothing is loaded yet
  const [profile, setProfile] = useState(null);

  // show loading immediately
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // stores pagination info for the sidebar
  // stores current page number
  // starts at 0
  // so page numbering here is zero-based
  //    page 0 = first page
  //    page 1 = second page
  const [page, setPage] = useState(0);

  // stores total number of pages for pagination
  const [totalPages, setTotalPages] = useState(1);

  // stores current calendar month and year selection in the SalaryCenter
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // JS month is 0-based
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const [calendarDays, setCalendarDays] = useState([]);

  const [debouncedSelectedCode, setDebouncedSelectedCode] = useState(null);

  // ✅ Load sidebar employees (paginated)
  // this runs when the page number changes, to load the right page of employees
  // Every time page changes, it:
  // 1. fetches all employees from backend
  // 2. calculates total pages
  // 3. gets only the 5 employees for the current page
  // 4. updates sidebar list
  // 5. auto-selects an employee if needed
  useEffect(() => {
    // This calls your Spring Boot API. // the fetch(..) below
    // It expects something like:
    // [
    //   { "code": "E001", "name": "John" },
    //   { "code": "E002", "name": "Mary" }
    // ]
  fetch(`${API_BASE}/api/employees`)
    .then((r) => r.json()) // r -> is the HTTP resopnse, and r.json() converts it to json 
    .then((data) => {
      // Ensure data is an array, if not use empty array
      const all = Array.isArray(data) ? data : [];
      setAllEmployees(all);

      // Calculate total pages based on total employees and page size
      const tp = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
      setTotalPages(tp);
      
      // Only auto-select once at the very beginning
      if (all.length > 0) {
        setSelectedCode(all[0].code);
      }
    })
    .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const start = page * PAGE_SIZE;
    const list = allEmployees.slice(start, start + PAGE_SIZE);
    setEmployees(list);
  }, [page, allEmployees]);

  // ✅ Load right panel when selection changes
  // Whenever the selected employee changes, this loads all data for that employee.
  useEffect(() => {
    if (!selectedCode) return;


    // This calls multiple APIs in parallel to get all data for the selected employee.
    // This runs all 4 requests together in parallel.
    Promise.all([
      fetch(`${API_BASE}/api/employees/${selectedCode}`).then((r) => r.json()),
      fetch(`${API_BASE}/api/employees/${selectedCode}/profile`).then((r) => r.json()),
      fetch(`${API_BASE}/api/employees/${selectedCode}/documents`).then((r) => r.json()),
      fetch(`${API_BASE}/api/employees/${selectedCode}/stats`).then((r) => r.json()),
    ])
      // emp = basic employee data
      // prof = profile object
      // docs = documents array
      // stats = stats array
      .then(([emp, prof, docs, stats]) => {
        const p = prof ?? {};
        // Build final profile object
        // This combines all the backend data into one object for ProfilePanel.
        setProfile({
          ...emp,
          info: [
            { k: "Birthday",    v: p.birthday,    icon: "cal"   },
            { k: "Phone number",v: p.phone,        icon: "phone" },
            { k: "Email",       v: p.email,        icon: "mail"  },
            { k: "Citizenship", v: p.citizenship,  icon: "id"    },
            { k: "City",        v: p.city,         icon: "pin"   },
            { k: "Address",     v: p.address,      icon: "pin"   },
            { k: "Department",  v: emp.department, icon: "id"    },
            { k: "Status",      v: emp.status,     icon: "id"    },
            { k: "Salary",      v: emp.salary != null ? `$${Number(emp.salary).toLocaleString()}` : null, icon: "cal" },
          ].filter((x) => x.v),  // .filter(...) <-- this removes/filter out any row item if the v: is empty like v: "" or v: null or v: undefined. So only info items with a value will be shown.

          // They ensure docs and stats are always arrays.
          // so if query docs or stat with return null or something unexpected, it will default to empty array instead of breaking the UI.
          docs: Array.isArray(docs) ? docs : [],
          stats: Array.isArray(stats) ? stats : [],
        });
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Error loading profile for employee " + selectedCode, err);
        }
      });

  }, [selectedCode]);

  // Load calendar data for selected employee + month/year
  useEffect(() => {
    if (!selectedCode) return;


    

    fetch(`${API_BASE}/api/employees/${selectedCode}/calendar?year=${selectedYear}&month=${Number(selectedMonth) + 1}`)
    .then((r) => r.json())
    .then((data) => {
      setCalendarDays(Array.isArray(data) ? data : []);
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        console.error("Error loading calendar data: ", err);
        setCalendarDays([]);
      }
    });
  }, [selectedCode, selectedYear, selectedMonth]);

  return (
    <MainGrid>
      <SidebarEmployees
        employees={employees}
        selectedCode={selectedCode}
        onSelect={setSelectedCode}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
      <SalaryCenter
        calendarDays={calendarDays}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
        selectedEmployee={profile}
      />

      <ProfilePanel profile={profile} />
    </MainGrid>
  );
}