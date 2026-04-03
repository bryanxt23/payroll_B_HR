import React, { useMemo } from "react";
import { buildCalendarGrid } from "./calendar.utils";
import CalendarDay from "./CalendarDay";
import styles from "./Calendar.module.css";

export default function Calendar({ calendarDays, selectedMonth, selectedYear }) {
  const calendarCells = useMemo(() => {
    return buildCalendarGrid({
      calendarDays, 
      year: selectedYear,
      month: selectedMonth,
    });
  }, [calendarDays, selectedMonth, selectedYear]);

  return (
    <div className={styles.calendar}>
      <div className={styles.dow}>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div className={styles.wknd}>Sat</div>
        <div className={styles.wknd}>Sun</div>
      </div>
      <div className={styles.grid}>

        {calendarCells.map((c, idx) => (
          <CalendarDay key={idx} cell={c} />
        ))}
      </div>
    </div>
  );
}
