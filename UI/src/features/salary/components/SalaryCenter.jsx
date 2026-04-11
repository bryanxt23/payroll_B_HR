import React, { useState } from "react";
import IconButton from "../../../components/ui/IconButton";
import Icon from "../../../components/ui/Icon";
import Calendar from "../calendar/Calendar";
import styles from "./SalaryCenter.module.css";

export default function SalaryCenter({
  calendarDays,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  selectedEmployee,
  timesheetSummary = { worked: 0, overtime: 0, leave: 0 },
}) {
  // Remember the user's hide/show choice across reloads.
  const [salaryHidden, setSalaryHidden] = useState(
    () => localStorage.getItem("salaryHidden") === "1"
  );
  const toggleSalary = () => {
    setSalaryHidden(prev => {
      const next = !prev;
      localStorage.setItem("salaryHidden", next ? "1" : "0");
      return next;
    });
  };

  const salary = selectedEmployee?.salary != null
    ? `$${Number(selectedEmployee.salary).toLocaleString()}`
    : "—";

  return (
    <div className={styles.center}>
      <div className={styles.centerTop}>
        <IconButton title="Pin" icon="pin" variant="circle" />

        <div className={styles.searchWrap}>
          <Icon name="search" />
          <input className={styles.searchInput} placeholder="Search" />
        </div>

        <IconButton title="Filter" icon="filter" variant="circle" />
        <IconButton title="Add" icon="plus" variant="circle" />
      </div>

      <div className={styles.centerStats}>
        <div className={styles.hoursBig}>
          <span>Monthly Salary</span> {salaryHidden ? "••••••" : salary}
          <button
            type="button"
            className={styles.salaryToggle}
            onClick={toggleSalary}
            aria-label={salaryHidden ? "Show salary" : "Hide salary"}
            title={salaryHidden ? "Show salary" : "Hide salary"}
          >
            {salaryHidden ? (
              // eye-off
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.77 19.77 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.77 19.77 0 0 1-3.17 4.19" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              // eye
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        <select
          className={styles.monthPill}
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
        >
          <option value="0">January</option>
          <option value="1">February</option>
          <option value="2">March</option>
          <option value="3">April</option>
          <option value="4">May</option>
          <option value="5">June</option>
          <option value="6">July</option>
          <option value="7">August</option>
          <option value="8">September</option>
          <option value="9">October</option>
          <option value="10">November</option>
          <option value="11">December</option>
        </select>
      </div>

      <div className={styles.bars}>
        <div className={styles.barCard}>
          <div className={styles.barLabel}>Worked</div>
          <div className={`${styles.barPill} ${styles.yellowPill}`}>
            <div className={`${styles.barFill} ${styles.fillYellow}`} style={{ width: `${Math.min(100, (timesheetSummary.worked / 200) * 100)}%` }} />
            <div className={styles.barText}>{timesheetSummary.worked} hrs</div>
          </div>
        </div>

        <div className={styles.barCard}>
          <div className={styles.barLabel}>Overtime</div>
          <div className={`${styles.barPill} ${styles.darkPill}`}>
            <div className={`${styles.barFill} ${styles.fillDark}`} style={{ width: `${Math.min(100, (timesheetSummary.overtime / 50) * 100)}%` }} />
            <div className={`${styles.barText} ${styles.barTextWhite}`}>{timesheetSummary.overtime} hrs</div>
          </div>
        </div>

        <div className={styles.barCard}>
          <div className={styles.barLabel}>Leave</div>
          <div className={styles.barPill}>
            <div className={`${styles.barFill} ${styles.fillGrey}`} style={{ width: `${Math.min(100, (timesheetSummary.leave / 80) * 100)}%` }} />
            <div className={styles.barText}>{timesheetSummary.leave} hrs</div>
          </div>
        </div>
      </div>

      <Calendar 
        calendarDays={calendarDays}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />
    </div>
  );
}
