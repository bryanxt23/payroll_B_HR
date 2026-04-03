export function buildCalendarGrid({ calendarDays, year, month }) {
  // Fixed “December-like” grid to match the screenshot layout.
  // 1st day starts on Wed.
  // const daysInMonth = 31;
  // const startDow = 2; // Mon=0, Tue=1, Wed=2
  const cells = [];
  const calendarMap = {};

  if (calendarDays) {
    calendarDays.forEach((row) => {
      calendarMap[row.day] = row;
    });
  }
  // JS month is 0-based: Jan=0, Dec=11
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Convert JS date to Monday-first index
  // JS: Sun=0, Mon=1, Tue=2 ... Sat=6
  // Wanted: Mon=0, Tue=1 ... Sun=6
  const startDow = (firstDay.getDay() + 6) % 7;

  // Previous month info
  const prevMonthDays = new Date(year, month, 0).getDate(); // get last day of previous month to know how many days it has

  // previous month padding: show 29,30
  for (let i = startDow - 1; i >= 0; i--) {
    cells.push({
      label: String(prevMonthDays - i),
      muted: true,
      striped: true,
    });
  }

  // // this is manual for now, will get the data from DB latyetr
  // // Manual iterate from 1 to 31 (daysInMonth) to create the calendar cells for each day
  // for (let d = 1; d <= daysInMonth; d++) {
  //   // the .includes(d) checks if it exists in the array [3, 5, 12, 19, 24, 26, 31]
  //   // if d == any in the arry like, 3, 5, 12... then striped = true, else false
  //   const striped = [3, 5, 12, 19, 24, 26, 31].includes(d);
  //   const event = d === 11; // birthday marker like screenshot
  //   cells.push({ label: String(d), striped, event });
  // }

  // this is manual for now, will get the data from DB latyetr
  // Manual iterate from 1 to 31 (daysInMonth) to create the calendar cells for each day
  for (let d = 1; d <= daysInMonth; d++) {
    // the .includes(d) checks if it exists in the array [3, 5, 12, 19, 24, 26, 31]
    const db = calendarMap[d];
    const striped = db ? db.striped : false;
    const event = db ? db.event : false;
    const eventLabel = db ? db.eventLabel : "";
    cells.push({ label: String(d), striped, event, eventLabel });
  }


  // next month padding
  // this is for after 31 to fill the grid up to 42 cells (6 rows of 7 days)
  while (cells.length < 42) {
    const n = cells.length - (startDow + daysInMonth) + 1;
    cells.push({ label: String(n), muted: true, striped: true });
  }

  return cells;
}
