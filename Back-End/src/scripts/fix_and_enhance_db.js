const { pool } = require('../config/db');

async function fixAndEnhance() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        console.log('Starting DB Repairs and Enhancements...');

        // 1. Fix Trigger Function (Correct Quoting and Casing)
        console.log('1. Replacing Trigger Function...');
        await client.query(`
            CREATE OR REPLACE FUNCTION update_program_stats()
            RETURNS TRIGGER AS $$
            BEGIN
                -- NEW REPORT
                IF TG_OP = 'INSERT' THEN
                    UPDATE bounty_programs 
                    SET total_reports = total_reports + 1,
                        pending_reports = pending_reports + 1
                    WHERE id_prog = NEW.post_id;
                    RETURN NEW;
                END IF;

                -- STATUS CHANGE
                IF TG_OP = 'UPDATE' AND OLD."Status" IS DISTINCT FROM NEW."Status" THEN
                    
                    -- Remove old status stats
                    IF OLD."Status" = 'Pending' THEN
                        UPDATE bounty_programs SET pending_reports = pending_reports - 1 WHERE id_prog = NEW.post_id;
                    ELSIF OLD."Status" = 'Approved' THEN
                        UPDATE bounty_programs SET approved_reports = approved_reports - 1 WHERE id_prog = NEW.post_id;
                    ELSIF OLD."Status" IN ('Rejected', 'RejectedW') THEN
                        UPDATE bounty_programs SET rejected_reports = rejected_reports - 1 WHERE id_prog = NEW.post_id;
                    END IF;

                    -- Apply new status stats
                    IF NEW."Status" = 'Pending' THEN
                        UPDATE bounty_programs SET pending_reports = pending_reports + 1 WHERE id_prog = NEW.post_id;
                    ELSIF NEW."Status" = 'Approved' THEN
                        UPDATE bounty_programs 
                        SET approved_reports = approved_reports + 1,
                            total_bounties_paid = total_bounties_paid + COALESCE(ABS(NEW."Reward"::NUMERIC), 0)
                        WHERE id_prog = NEW.post_id;
                    ELSIF NEW."Status" IN ('Rejected', 'RejectedW') THEN
                        UPDATE bounty_programs SET rejected_reports = rejected_reports + 1 WHERE id_prog = NEW.post_id;
                    END IF;
                    
                    -- Special case: If status stayed Approved but Reward changed
                    -- Ideally handled, but let's stick to status transitions primarily as per request.
                    
                    RETURN NEW;
                END IF;

                -- DELETE REPORT
                IF TG_OP = 'DELETE' THEN
                    UPDATE bounty_programs 
                    SET total_reports = total_reports - 1,
                        pending_reports = pending_reports - CASE WHEN OLD."Status" = 'Pending' THEN 1 ELSE 0 END,
                        approved_reports = approved_reports - CASE WHEN OLD."Status" = 'Approved' THEN 1 ELSE 0 END,
                        rejected_reports = rejected_reports - CASE WHEN OLD."Status" IN ('Rejected', 'RejectedW') THEN 1 ELSE 0 END,
                        total_bounties_paid = total_bounties_paid - CASE WHEN OLD."Status" = 'Approved' THEN COALESCE(ABS(OLD."Reward"::NUMERIC), 0) ELSE 0 END
                    WHERE id_prog = OLD.post_id;
                    RETURN OLD;
                END IF;

                RETURN NULL;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // 2. Performance Indexes
        console.log('2. Adding Performance Indexes...');
        await client.query(`CREATE INDEX IF NOT EXISTS idx_submit_status ON submit ("Status");`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_submit_user ON submit ("user_id");`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_submit_post ON submit ("post_id");`);

        // 3. Backfill Data (Reset and Reseed to strictly match current reality)
        console.log('3. Backfilling Data...');
        // First reset all stats to 0 to avoid double counting if we just added to existing
        await client.query(`
            UPDATE bounty_programs SET 
                total_reports = 0,
                pending_reports = 0,
                approved_reports = 0,
                rejected_reports = 0,
                total_bounties_paid = 0;
        `);

        await client.query(`
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
        `);

        await client.query('COMMIT');
        console.log('Database successfully repaired and enhanced!');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

fixAndEnhance();
