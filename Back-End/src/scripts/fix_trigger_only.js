const { pool } = require('../config/db');

async function fixTrigger() {
    console.log('Connecting to DB...');
    const client = await pool.connect();
    console.log('Connected.');

    try {
        await client.query('BEGIN');
        console.log('Dropping existing trigger...');
        await client.query('DROP TRIGGER IF EXISTS trigger_update_program_stats ON submit');
        await client.query('DROP TRIGGER IF EXISTS trg_update_program_stats ON submit'); // User might have named it this?

        console.log('Replacing Function...');
        // STRICT QUOTING IS KEY HERE
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
                    
                    -- Remove old stats
                    IF OLD."Status" = 'Pending' THEN
                        UPDATE bounty_programs SET pending_reports = pending_reports - 1 WHERE id_prog = NEW.post_id;
                    ELSIF OLD."Status" = 'Approved' THEN
                        UPDATE bounty_programs SET approved_reports = approved_reports - 1 WHERE id_prog = NEW.post_id;
                    ELSIF OLD."Status" IN ('Rejected', 'RejectedW') THEN
                        UPDATE bounty_programs SET rejected_reports = rejected_reports - 1 WHERE id_prog = NEW.post_id;
                    END IF;

                    -- Apply new stats
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

        console.log('Recreating Trigger...');
        await client.query(`
            CREATE TRIGGER trigger_update_program_stats
            AFTER INSERT OR UPDATE OR DELETE ON submit
            FOR EACH ROW EXECUTE FUNCTION update_program_stats();
        `);

        await client.query('COMMIT');
        console.log('SUCCESS: Trigger Repaired.');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('FAILURE:', e);
        process.exit(1);
    } finally {
        client.release();
        pool.end();
    }
}

fixTrigger();
