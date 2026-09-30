const { test } = require('node:test');
const assert = require('node:assert/strict');
const calc = require('../src/services/trendCalculationService');
const { detectPatterns } = require('../src/services/patternDetectionService');
const { validateSummary } = require('../src/services/aiInterpretationService');
const row = (date, score, id = 1) => ({ id, mood_date: date, mood_score: score });

test('assessment separates sets, orders rounds, and handles missing/zero baseline', () => {
  const result = calc.assessmentTrend([
    { id: 2, set_id: 1, score: 5, taken_at: '2026-09-02' },
    { id: 1, set_id: 1, score: 10, taken_at: '2026-09-01' },
    { id: 3, set_id: 2, score: 0, taken_at: '2026-09-01' },
    { id: 4, set_id: 2, score: 2, taken_at: '2026-09-02' },
    { id: 5, set_id: 3, score: 7, taken_at: '2026-09-01' },
  ]).sets;
  assert.equal(result[0].percent_change, -50); assert.equal(result[0].direction, 'improving');
  assert.equal(result[1].percent_change, null); assert.equal(result[1].direction, 'worsening');
  assert.equal(result[2].direction, 'insufficient_data');
  assert.deepEqual(calc.assessmentTrend([]), { sets: [] });
});
test('mood windows do not overlap, missing days are not zero, and latest duplicate wins', () => {
  const result = calc.moodTrend([
    row('2026-09-03', 5), row('2026-09-04', 2), row('2026-09-05', 4),
    row('2026-09-07', 1), row('2026-09-07', 5, 2), row('2026-09-08', 1),
  ], 2, '2026-09-07').raw_numbers;
  assert.equal(result.current_average, 5); assert.equal(result.current_count, 1);
  assert.equal(result.previous_average, 3); assert.equal(result.percent_change, 66.67);
  assert.equal(result.direction, 'improving');
  assert.equal(calc.moodTrend([], 14, '2026-09-07').raw_numbers.current_average, null);
});
test('Bangkok date boundaries are independent of server timezone', () => {
  assert.equal(calc.bangkokDate(new Date('2026-09-29T18:00:00Z')), '2026-09-30');
  assert.equal(calc.shiftDate('2026-03-01', -1), '2026-02-28');
});
test('mood_drop requires consecutive calendar days and a recent end', () => {
  const rows = [row('2026-09-05', 2), row('2026-09-06', 1), row('2026-09-07', 2)];
  assert.equal(detectPatterns(rows, '2026-09-08')[0].raw_numbers.consecutive_days, 3);
  assert.equal(detectPatterns(rows, '2026-09-10').length, 0);
  assert.equal(detectPatterns([rows[0], rows[2]], '2026-09-08').length, 0);
  assert.equal(detectPatterns([...rows, row('2026-09-08', 4)], '2026-09-08').length, 0);
});
test('gap strictly over 5 days, regular baseline, and absence beyond 7 days', () => {
  const rows = [1, 2, 3, 4].map(d => row(`2026-09-0${d}`, 4));
  assert.equal(detectPatterns(rows, '2026-09-09').length, 0);
  assert.equal(detectPatterns(rows, '2026-09-10')[0].alert_type, 'no_record_gap');
  assert.equal(detectPatterns(rows, '2026-09-20')[0].raw_numbers.days_since_last_record, 16);
  assert.equal(detectPatterns([rows[0]], '2026-09-20').length, 0);
});
test('summary guard rejects unsupported numbers, including Thai digits', () => {
  assert.equal(validateSummary('ค่าเฉลี่ย 2.5', { average: 2.5 }), true);
  assert.equal(validateSummary('ค่าเฉลี่ย 9', { average: 2.5 }), false);
  assert.equal(validateSummary('ค่าเฉลี่ย ๙', { average: 2.5 }), false);
});
