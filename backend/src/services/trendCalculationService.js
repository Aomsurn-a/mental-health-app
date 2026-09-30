const DAY = 86400000;
const round = n => Math.round((n + Number.EPSILON) * 100) / 100;

// คำนวณวันปฏิทินไทยให้เหมือนกันทั้ง API และงานรายวัน ไม่เรียก AI
function bangkokDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
function shiftDate(date, days) {
  return new Date(Date.parse(date + 'T00:00:00Z') + days * DAY).toISOString().slice(0, 10);
}
function daysBetween(from, to) {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / DAY);
}

// คำนวณผลต่างและเปอร์เซ็นต์เท่านั้น ฐานศูนย์/ข้อมูลไม่พอไม่ใช้ Infinity หรือคะแนนสมมติ
function compare(latest, previous, higherIsBetter) {
  if (latest === null || previous === null) return { difference: null, percent_change: null, direction: 'insufficient_data' };
  const delta = latest - previous;
  return {
    difference: round(delta),
    percent_change: previous === 0 ? null : round(delta / Math.abs(previous) * 100),
    direction: delta === 0 ? 'stable' : (delta > 0) === higherIsBetter ? 'improving' : 'worsening',
  };
}

// คำนวณคะแนนแยก set_id ตามลำดับ taken_at/id; ชุดเดิม 1–4 คะแนนต่ำหมายถึงดีขึ้น
function assessmentTrend(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (row.score === null || !Number.isFinite(Number(row.score))) continue;
    const key = Number(row.set_id);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return { sets: [...groups].map(([set_id, items]) => {
    items.sort((a, b) => new Date(a.taken_at) - new Date(b.taken_at) || a.id - b.id);
    const last = items.at(-1), prior = items.at(-2);
    const latest = Number(last.score), previous = prior ? Number(prior.score) : null;
    const change = compare(latest, previous, false);
    if (![1, 2, 3, 4].includes(set_id) && previous !== null) change.direction = 'unknown_scale';
    return { set_id, set_name: last.set_name, count: items.length, latest_score: latest, latest_risk_level: last.risk_level || null,
      previous_score: previous, latest_at: last.taken_at, previous_at: prior?.taken_at || null, ...change };
  }) };
}

// คำนวณจากหนึ่งรายการต่อวัน: ใช้ id ล่าสุด ป้องกันวันซ้ำ และไม่แปลงวันขาดเป็นคะแนนศูนย์
function dailyMoods(rows) {
  const map = new Map();
  for (const row of [...rows].sort((a, b) => a.id - b.id)) {
    if (row.mood_score !== null && Number.isFinite(Number(row.mood_score))) map.set(row.mood_date, row);
  }
  return [...map.values()].sort((a, b) => a.mood_date.localeCompare(b.mood_date));
}

// คำนวณค่าเฉลี่ยสองช่วงไม่ทับกัน รวมวันนี้; note ส่งต่อเท่านั้น ไม่ตีความในส่วนนี้
function moodTrend(rows, days = 14, today = bangkokDate()) {
  const currentStart = shiftDate(today, 1 - days), previousStart = shiftDate(today, 1 - 2 * days);
  const daily = dailyMoods(rows);
  const current = daily.filter(r => r.mood_date >= currentStart && r.mood_date <= today);
  const previous = daily.filter(r => r.mood_date >= previousStart && r.mood_date < currentStart);
  const average = items => items.length ? items.reduce((n, r) => n + Number(r.mood_score), 0) / items.length : null;
  const latestAvg = average(current), previousAvg = average(previous);
  return {
    raw_numbers: { days, current_start: currentStart, current_end: today,
      previous_start: previousStart, previous_end: shiftDate(currentStart, -1),
      current_average: latestAvg === null ? null : round(latestAvg),
      previous_average: previousAvg === null ? null : round(previousAvg),
      current_count: current.length, previous_count: previous.length,
      ...compare(latestAvg, previousAvg, true) },
    notes: current.map(r => r.note).filter(note => typeof note === 'string' && note.trim()),
  };
}
module.exports = { bangkokDate, shiftDate, daysBetween, compare, assessmentTrend, dailyMoods, moodTrend };
