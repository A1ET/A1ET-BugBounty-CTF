const { pool } = require('../config/db');

async function check() {
    const res = await pool.query('SELECT id_prog, pending_reports FROM bounty_programs WHERE pending_reports < 0');
    if (res.rows.length === 0) {
        console.log("Verified: No programs with negative pending_reports.");
    } else {
        console.log("Failed: Found programs with negative pending_reports:", res.rows);
    }
    pool.end();
}
check();
