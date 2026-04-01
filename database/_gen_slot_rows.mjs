const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const slots = [
  ["07:00", "07:45"],
  ["07:45", "08:30"],
  ["08:30", "09:15"],
  ["09:30", "10:15"],
  ["10:15", "11:00"],
  ["11:00", "11:45"],
  ["12:00", "12:45"],
];
let idx = 0;
const lines = [];
for (const classId of [1, 2, 3]) {
  for (const day of days) {
    let p = 0;
    for (const [st, en] of slots) {
      const subj = 1 + ((idx * 17 + classId * 11 + p * 5) % 3);
      const teach = 1 + ((idx * 19 + classId * 3 + p * 7) % 3);
      lines.push(`(${classId},${subj},${teach},'${day}','${st}','${en}')`);
      idx++;
      p++;
    }
  }
}
process.stdout.write(lines.join(",\n"));
