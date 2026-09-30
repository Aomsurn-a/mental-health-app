const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const source = process.env.DB_NAME, schema = 'mental_scheduletemplate_test_' + Date.now();
let admin, db, server, browser;
const pass = name => console.log('PASS ' + name);

// ใช้ schema ใหม่และข้อมูลจำลองเท่านั้น ไม่สร้างตารางนัดหมายให้ผู้ใช้จริง
(async () => {
  try {
    assert.match(source, /^\w+$/); assert.match(schema, /^mental_scheduletemplate_test_\d+$/);
    admin = await mysql.createConnection({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD });
    await admin.query('CREATE DATABASE ' + schema + ' CHARACTER SET utf8mb4');
    const [tables] = await admin.query('SHOW TABLES FROM ' + source);
    for (const row of tables) {
      const name = Object.values(row)[0]; assert.match(name, /^\w+$/);
      if (name !== 'schedule_templates') await admin.query('CREATE TABLE ' + schema + '.' + name + ' LIKE ' + source + '.' + name);
    }
    process.env.DB_NAME = schema;
    db = require('../src/config/db');
    const migration = fs.readFileSync(path.join(__dirname, '../../Data/migration_schedule_templates.sql'), 'utf8');
    await db.query(migration); await db.query(migration); pass('migration and safe rerun');
    const users = {}, psys = {}, tokens = {};
    for (const [name, role] of [['psych', 'psychologist'], ['other', 'psychologist'], ['patient', 'user'], ['admin', 'admin']]) {
      const [user] = await db.query('INSERT INTO users(username,email,password,first_name,last_name,role) VALUES(?,?,?,?,?,?)', [name, name + '@example.test', 'synthetic-disabled', name, 'Test', role]);
      users[name] = user.insertId;
      tokens[name] = jwt.sign({ id: user.insertId, role }, process.env.JWT_SECRET);
      if (role === 'psychologist') {
        const [psych] = await db.query('INSERT INTO psychologists(user_id,license_number) VALUES(?,?)', [user.insertId, 'TEST-' + name]); psys[name] = psych.insertId;
      }
    }
    server = http.createServer(require('../src/app'));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    const prefix = '/api/psychologist/schedule-template';
    async function request(method, suffix = '', body, actor = 'psych', root = prefix) {
      const response = await fetch(base + root + suffix, { method, headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: 'Bearer ' + tokens[actor] } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, body: await response.json() };
    }
    const slot = { day_of_week: 1, start_time: '09:00', end_time: '12:00', max_patients_per_slot: 2 };
    for (const [method, suffix, body] of [['GET', '', undefined], ['POST', '', slot], ['PUT', '/1', slot], ['DELETE', '/1', undefined], ['POST', '/generate-now', { weekStartDate: '2026-10-05' }]]) {
      assert.equal((await request(method, suffix, body, null)).status, 401);
      for (const role of ['patient', 'admin']) assert.equal((await request(method, suffix, body, role)).status, 403);
    }
    pass('auth and psychologist role on all endpoints');
    for (const patch of [{ day_of_week: -1 }, { day_of_week: 7 }, { day_of_week: '1' }, { start_time: '25:00' }, { start_time: '12:00' }, { end_time: '08:00' }, { max_patients_per_slot: 0 }, { max_patients_per_slot: 1.5 }, { max_patients_per_slot: '2' }]) {
      assert.equal((await request('POST', '', { ...slot, ...patch })).status, 400);
    }
    for (const date of ['2026-02-30', '2026-10-04', '2026-10-05 OR 1=1', null]) assert.equal((await request('POST', '/generate-now', { weekStartDate: date })).status, 400);
    for (const weekCount of [0, 3, '2', 1.5]) assert.equal((await request('POST', '/generate-now', { weekStartDate: '2026-10-05', weekCount })).status, 400);
    pass('day, time, capacity and Monday/date validation');
    let result = await request('POST', '', { ...slot, psychologist_id: psys.other });
    assert.equal(result.status, 201); const monday = result.body.id;
    assert.equal((await request('GET', '', undefined, 'other')).body.length, 0);
    for (const method of ['PUT', 'DELETE']) assert.equal((await request(method, '/' + monday, slot, 'other')).status, 404);
    assert.equal((await request('POST', '', { ...slot, start_time: '11:00' })).status, 409);
    const concurrentSlots = await Promise.all([1, 2].map(() => request('POST', '', { ...slot, start_time: '12:00', end_time: '13:00' })));
    assert.deepEqual(concurrentSlots.map(r => r.status).sort(), [201, 409]);
    const adjacent = concurrentSlots.find(r => r.status === 201).body.id;
    result = await request('POST', '', { ...slot, day_of_week: 0 }); assert.equal(result.status, 201); const sunday = result.body.id;
    pass('ownership, overlapping/concurrent templates rejected, adjacent slots and multiple weekdays allowed');

    const generation = require('../src/services/scheduleGenerationService');
    assert.equal(generation.bangkokDate(new Date('2026-10-03T17:00:00Z')), '2026-10-04');
    assert.deepEqual(generation.nextTwoWeeks('2026-12-27'), ['2026-12-28', '2027-01-04']);
    assert.deepEqual(generation.nextTwoWeeks('2026-10-05'), ['2026-10-12', '2026-10-19']);
    const concurrentWeeks = await Promise.all([1, 2, 3].map(() => request('POST', '/generate-now', { weekStartDate: '2026-10-05' })));
    assert.deepEqual(concurrentWeeks.map(r => r.body.status).sort(), ['created', 'skipped', 'skipped']);
    const weekId = concurrentWeeks.find(r => r.body.status === 'created').body.week_id;
    const [generated] = await db.query("SELECT day_of_week, DATE_FORMAT(work_date,'%Y-%m-%d') AS work_date FROM psychologist_schedules WHERE week_id = ? ORDER BY work_date,start_time", [weekId]);
    assert.deepEqual(generated.map(s => s.work_date), ['2026-10-05', '2026-10-05', '2026-10-11']);
    assert.deepEqual(generated.map(s => s.day_of_week), [1, 1, 0]);
    assert.equal((await request('GET', '/weeks/' + weekId, undefined, 'psych', '/api/schedule')).body.schedules.length, 3);
    pass('concurrent generation is idempotent, Monday/Sunday work_date and old GET endpoint compatible');

    const editedWeek = { week_start: '2026-10-05', week_end: '2026-10-11', days: [{ day_of_week: 3, work_date: '2026-10-07', slots: [{ start_time: '15:00', end_time: '16:00', max_patients_per_slot: 9 }] }] };
    assert.equal((await request('PUT', '/weeks/' + weekId, editedWeek, 'psych', '/api/schedule')).status, 200);
    assert.equal((await request('PUT', '/' + monday, { ...slot, max_patients_per_slot: 4 })).status, 200);
    result = await request('POST', '/generate-now', { weekStartDate: '2026-10-05' }); assert.equal(result.body.reason, 'week_exists');
    const after = await request('GET', '/weeks/' + weekId, undefined, 'psych', '/api/schedule');
    assert.equal(after.body.schedules.length, 1); assert.equal(after.body.schedules[0].max_patients_per_slot, 9);
    result = await request('POST', '/generate-now', { weekStartDate: '2026-10-12' });
    const [future] = await db.query('SELECT max_patients_per_slot FROM psychologist_schedules WHERE week_id = ? AND day_of_week = ? ORDER BY start_time', [result.body.week_id, 1]);
    assert.equal(future[0].max_patients_per_slot, 4);
    await request('DELETE', '/weeks/' + weekId, undefined, 'psych', '/api/schedule');
    const regenerated = await Promise.all([1, 2, 3].map(() => request('POST', '/generate-now', { weekStartDate: '2026-10-05' })));
    assert.deepEqual(regenerated.map(r => r.body.status).sort(), ['created', 'skipped', 'skipped']);
    const recreated = regenerated.find(r => r.body.status === 'created').body;
    assert.notEqual(recreated.week_id, weekId);
    const [oldWeek] = await db.query('SELECT active_flag FROM psychologist_schedule_weeks WHERE id = ?', [weekId]);
    assert.equal(oldWeek[0].active_flag, 0);
    const [oldSlots] = await db.query('SELECT id FROM psychologist_schedules WHERE week_id = ? AND active_flag = ?', [weekId, 1]);
    assert.equal(oldSlots.length, 0);
    pass('existing weekly editor works; deleted week recreated once using new rows, keeping deleted history');
    result = await request('POST', '/generate-now', { weekStartDate: '2027-03-01', weekCount: 2 });
    assert.equal(result.status, 201); assert.equal(result.body.created, 2);
    assert.deepEqual(result.body.results.map(r => r.week_start), ['2027-03-01', '2027-03-08']);
    const pairFirst = result.body.results[0].week_id;
    const pairSecond = result.body.results[1].week_id;
    await db.query('UPDATE psychologist_schedules SET max_patients_per_slot = ? WHERE week_id = ?', [7, pairSecond]);
    await request('DELETE', '/weeks/' + pairFirst, undefined, 'psych', '/api/schedule');
    result = await request('POST', '/generate-now', { weekStartDate: '2027-03-01', weekCount: 2 });
    assert.equal(result.body.created, 1); assert.equal(result.body.skipped, 1);
    const [preserved] = await db.query('SELECT max_patients_per_slot FROM psychologist_schedules WHERE week_id = ? AND active_flag = ?', [pairSecond, 1]);
    assert.ok(preserved.every(row => row.max_patients_per_slot === 7));
    result = await request('POST', '/generate-now', { weekStartDate: '2027-03-01', weekCount: 2 });
    assert.equal(result.body.created, 0); assert.equal(result.body.skipped, 2);
    pass('two-week request creates both, recreates only missing/deleted week and never overwrites existing week');

    // บังคับ insert ล้มเหลวเพื่อพิสูจน์ว่าทั้งสัปดาห์และ slots rollback พร้อมกัน
    await db.query("CREATE TRIGGER test_schedule_failure BEFORE INSERT ON psychologist_schedules FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'synthetic failure'");
    await assert.rejects(generation.generateWeekFromTemplate(psys.psych, '2026-11-02'));
    await db.query('DROP TRIGGER test_schedule_failure');
    const [rolledBack] = await db.query('SELECT id FROM psychologist_schedule_weeks WHERE week_start = ?', ['2026-11-02']);
    assert.equal(rolledBack.length, 0); pass('transaction rolls back week and slots on insertion failure');
    const job = require('../src/jobs/weeklyScheduleGeneratorJob');
    const scheduled = job.startWeeklyScheduleGeneratorJob();
    assert.equal(scheduled.timezone, 'Asia/Bangkok'); assert.equal(scheduled.cronExpression, '0 0 * * 0'); await scheduled.destroy();
    let stats = await job.runWeeklyScheduleGenerator({ db, today: '2026-12-27', dryRun: true });
    assert.equal(stats.would_create, 2); assert.equal(stats.created, 0);
    stats = await job.runWeeklyScheduleGenerator({ db, today: '2026-12-27' }); assert.equal(stats.created, 2); assert.equal(stats.failed, 0);
    stats = await job.runWeeklyScheduleGenerator({ db, today: '2026-12-27' }); assert.equal(stats.skipped, 2); assert.equal(stats.created, 0);
    const [cronWeeks] = await db.query('SELECT id FROM psychologist_schedule_weeks WHERE psychologist_id = ? AND week_start = ? AND active_flag = ?', [psys.psych, '2026-12-28', 1]);
    await request('DELETE', '/weeks/' + cronWeeks[0].id, undefined, 'psych', '/api/schedule');
    stats = await job.runWeeklyScheduleGenerator({ db, today: '2026-12-27' }); assert.equal(stats.created, 1); assert.equal(stats.skipped, 1);
    pass('Sunday midnight Bangkok cron; dry-run; two upcoming weeks across year; repeat run skips');
    for (const id of [monday, sunday, adjacent]) assert.equal((await request('DELETE', '/' + id)).status, 200);
    assert.equal((await request('GET')).body.length, 0);
    assert.equal((await request('POST', '/generate-now', { weekStartDate: '2027-02-01' })).body.reason, 'no_templates');
    result = await request('POST', '/generate-now', { weekStartDate: '2027-02-01', weekCount: 2 });
    assert.equal(result.body.created, 0); assert.ok(result.body.results.every(row => row.reason === 'no_templates'));
    stats = await job.runWeeklyScheduleGenerator({ db, today: '2027-01-31' }); assert.equal(stats.created, 0); assert.equal(stats.psychologists, 0);
    const [deleted] = await db.query('SELECT active_flag FROM schedule_templates WHERE id = ?', [monday]); assert.equal(deleted[0].active_flag, 0);
    pass('soft delete and empty templates do not create empty weeks');
    if (process.argv.includes('--browser')) {
      // เคลียร์เฉพาะสถานะ fixture ใน schema ทดสอบ เพื่อให้พิสูจน์ auto-fill สองสัปดาห์ได้ทุกวันที่รัน
      await db.query('UPDATE psychologist_schedule_weeks SET active_flag = ? WHERE psychologist_id = ?', [0, psys.psych]);
      await db.query('UPDATE psychologist_schedules SET active_flag = ? WHERE psychologist_id = ?', [0, psys.psych]);
      const { chromium } = require(process.env.PLAYWRIGHT_PATH);
      browser = await chromium.launch({ headless: true, channel: 'msedge' });
      const context = await browser.newContext(); await context.addInitScript(token => localStorage.setItem('token', token), tokens.psych);
      await context.route('http://localhost:3000/api/**', route => route.continue({ url: route.request().url().replace('http://localhost:3000', base) }));
      const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto((process.env.TEST_UI_URL || 'http://127.0.0.1:5188') + '/schedule-template');
      await page.getByText('ยังไม่มีช่วงเวลาประจำ เริ่มเพิ่มวันและเวลาด้านล่าง', { exact: true }).waitFor();
      await page.getByLabel('เวลาเริ่ม', { exact: true }).fill('09:00'); await page.getByLabel('เวลาเริ่ม', { exact: true }).press('Tab');
      await page.getByLabel('เวลาสิ้นสุด', { exact: true }).fill('12:00'); await page.getByLabel('เวลาสิ้นสุด', { exact: true }).press('Tab');
      await page.getByRole('button', { name: 'เพิ่มตารางงานประจำ', exact: true }).click();
      await page.getByText(/บันทึกตารางงานประจำแล้ว · สร้างตารางแล้ว 2 สัปดาห์/).waitFor();
      const [autoWeeks] = await db.query('SELECT id FROM psychologist_schedule_weeks WHERE psychologist_id = ? AND active_flag = ? ORDER BY week_start', [psys.psych, 1]);
      assert.equal(autoWeeks.length, 2);
      await page.getByRole('button', { name: 'แก้ไขวันจันทร์ 09:00', exact: true }).click();
      await page.getByLabel('จำนวนรับ / ชั่วโมง', { exact: true }).fill('3');
      await page.getByRole('button', { name: 'บันทึกการแก้ไข', exact: true }).click();
      await page.getByText(/บันทึกตารางงานประจำแล้ว · ทั้ง 2 สัปดาห์มีตารางอยู่แล้ว/).waitFor();
      const [autoSlots] = await db.query('SELECT max_patients_per_slot FROM psychologist_schedules WHERE psychologist_id = ? AND active_flag = ?', [psys.psych, 1]);
      assert.ok(autoSlots.every(row => row.max_patients_per_slot === 1));
      await request('DELETE', '/weeks/' + autoWeeks[0].id, undefined, 'psych', '/api/schedule');
      await page.getByRole('button', { name: 'แก้ไขตาราง 2 สัปดาห์นี้จากตารางงานประจำ', exact: true }).click();
      await page.getByText(/สร้างตารางแล้ว 1 สัปดาห์ · อีก 1 สัปดาห์มีตารางอยู่แล้วจึงไม่สร้างทับ/).waitFor();
      for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
        await page.setViewportSize({ width, height });
        await page.screenshot({ path: path.join(__dirname, '../../.impeccable/review/schedule-template-' + name + '.png'), fullPage: true, animations: 'disabled' });
        assert.equal(await page.locator('.schedule-template-page').evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      }
      await page.getByRole('button', { name: 'ลบวันจันทร์ 09:00', exact: true }).click();
      await page.getByRole('button', { name: 'ลบตารางงานประจำ', exact: true }).click();
      await page.getByText('ยังไม่มีช่วงเวลาประจำ เริ่มเพิ่มวันและเวลาด้านล่าง', { exact: true }).waitFor();
      assert.deepEqual(errors, []); pass('browser create/edit/delete/generate and desktop/mobile without overflow');
    }
  } catch (error) { console.error(error.stack); process.exitCode = 1; }
  finally {
    if (browser) await browser.close();
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (db) await db.end();
    if (admin) {
      assert.match(schema, /^mental_scheduletemplate_test_\d+$/); assert.notEqual(schema, source);
      await admin.query('DROP DATABASE IF EXISTS ' + schema); await admin.end();
    }
  }
})();
