const { pool } = require('../config/db');

async function recalculateStats() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('Recalculating stats for all programs...');

        // 1. Reset all stats to 0 first to ensure clean state
        await client.query(`
            UPDATE bounty_programs SET
                total_reports = 0,
                pending_reports = 0,
                approved_reports = 0,
                rejected_reports = 0,
                total_bounties_paid = 0;
        `);

        // 2. Calculate stats from submit table and update bounty_programs
        // We join on id_prog = post_id
        const query = `
            UPDATE bounty_programs p
            SET 
                total_reports = s.total,
                pending_reports = s.pending,
                approved_reports = s.approved,
                rejected_reports = s.rejected,
                total_bounties_paid = s.paid
            FROM (
                SELECT 
                    post_id,
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE "Status" = 'Pending') as pending,
                    COUNT(*) FILTER (WHERE "Status" = 'Approved') as approved,
                    COUNT(*) FILTER (WHERE "Status" IN ('Rejected', 'RejectedW')) as rejected,
                    COALESCE(SUM(NULLIF("Reward", '')::NUMERIC), 0) FILTER (WHERE "Status" = 'Approved') as paid
                FROM submit
                GROUP BY post_id
            ) s
            WHERE p.id_prog = s.post_id;
        `;

        const res = await client.query(query);
        console.log(`Updated stats for ${res.rowCount} programs.`);

        // Log the fixed stats for the program in question (ID 4 based on screenshot)
        const check = await client.query(`SELECT id_prog, pending_reports FROM bounty_programs WHERE id_prog = 4`);
        if (check.rows.length > 0) {
            console.log(`Program ID 4 fixed pending count: ${check.rows[0].pending_reports}`);
        }

        await client.query('COMMIT');
        console.log('Recalculation complete.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Recalculation failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

recalculateStats();
