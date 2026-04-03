import React from "react";
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
}) {
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
          <span>Monthly Salary</span> {salary}
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
            <div className={`${styles.barFill} ${styles.fillYellow}`} />
            <div className={styles.barText}>167 hrs</div>
          </div>
        </div>

        <div className={styles.barCard}>
          <div className={styles.barLabel}>Overtime</div>
          <div className={`${styles.barPill} ${styles.darkPill}`}>
            <div className={`${styles.barFill} ${styles.fillDark}`} />
            <div className={`${styles.barText} ${styles.barTextWhite}`}>43 hrs</div>
          </div>
        </div>

        <div className={styles.barCard}>
          <div className={styles.barLabel}>Leave</div>
          <div className={styles.barPill}>
            <div className={`${styles.barFill} ${styles.fillGrey}`} />
            <div className={styles.barText}>74 hrs</div>
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
