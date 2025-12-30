const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function verify() {
    try {
        const client = await pool.connect();
        const res = await client.query("SELECT pg_get_functiondef('update_program_stats'::regproc)");
        const def = res.rows[0].pg_get_functiondef;

        fs.writeFileSync(path.join(__dirname, '../../function_def.txt'), def, 'utf8');
        console.log('Definition written.');
    } catch (e) {
        console.error(e);
        fs.writeFileSync(path.join(__dirname, '../../function_def.txt'), 'ERROR: ' + e.message, 'utf8');
    } finally {
        pool.end();
    }
}

verify();
