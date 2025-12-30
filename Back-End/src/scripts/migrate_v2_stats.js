const { pool } = require('../config/db');

async function migrate() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('1. Adding stats columns to bounty_programs...');
        await client.query(`
            ALTER TABLE bounty_programs 
            ADD COLUMN IF NOT EXISTS total_reports INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS pending_reports INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS approved_reports INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS rejected_reports INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS total_bounties_paid NUMERIC(10, 2) DEFAULT 0.00;
        `);

        console.log('2. Creating audit_logs table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                actor_id INTEGER REFERENCES users(id),
                action VARCHAR(50) NOT NULL,
                target_id INTEGER,
                details TEXT,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('3. Creating notifications table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(20) NOT NULL, -- 'REPORT_UPDATE', 'REWARD', 'SYSTEM'
                message TEXT NOT NULL,
                link VARCHAR(255),
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('4. Creating Trigger Function for Stats...');
        // Correct logic: post_id in submit relates to bounty_programs.id_prog
        await client.query(`
            CREATE OR REPLACE FUNCTION update_program_stats()
            RETURNS TRIGGER AS $$
            BEGIN
                IF (TG_OP = 'INSERT') THEN
                    UPDATE bounty_programs 
                    SET total_reports = total_reports + 1,
                        pending_reports = pending_reports + 1
                    WHERE id_prog = NEW.post_id;
                    RETURN NEW;
                ELSIF (TG_OP = 'DELETE') THEN
                    UPDATE bounty_programs 
                    SET total_reports = total_reports - 1,
                        pending_reports = pending_reports - CASE WHEN OLD."Status" = 'Pending' THEN 1 ELSE 0 END,
                        approved_reports = approved_reports - CASE WHEN OLD."Status" = 'Approved' THEN 1 ELSE 0 END,
                        rejected_reports = rejected_reports - CASE WHEN OLD."Status" IN ('Rejected', 'RejectedW') THEN 1 ELSE 0 END,
                        total_bounties_paid = total_bounties_paid - COALESCE(ABS(OLD."Reward"::NUMERIC), 0)
                    WHERE id_prog = OLD.post_id;
                    RETURN OLD;
                ELSIF (TG_OP = 'UPDATE') THEN
                    -- Status Changed from Pending to Approved
                    IF OLD."Status" != NEW."Status" THEN
                         -- Handle Old Status Decrement
                         IF OLD."Status" = 'Pending' THEN
                             UPDATE bounty_programs SET pending_reports = pending_reports - 1 WHERE id_prog = NEW.post_id;
                         ELSIF OLD."Status" = 'Approved' THEN
                             UPDATE bounty_programs SET approved_reports = approved_reports - 1 WHERE id_prog = NEW.post_id;
                         ELSIF OLD."Status" IN ('Rejected', 'RejectedW') THEN
                             UPDATE bounty_programs SET rejected_reports = rejected_reports - 1 WHERE id_prog = NEW.post_id;
                         END IF;

                         -- Handle New Status Increment
                         IF NEW."Status" = 'Pending' THEN
                             UPDATE bounty_programs SET pending_reports = pending_reports + 1 WHERE id_prog = NEW.post_id;
                         ELSIF NEW."Status" = 'Approved' THEN
                             UPDATE bounty_programs SET approved_reports = approved_reports + 1 WHERE id_prog = NEW.post_id;
                         ELSIF NEW."Status" IN ('Rejected', 'RejectedW') THEN
                             UPDATE bounty_programs SET rejected_reports = rejected_reports + 1 WHERE id_prog = NEW.post_id;
                         END IF;
                    END IF;
                    
                    -- Reward Changed (Added or Modified only if Approved)
                    IF NEW."Status" = 'Approved' AND (OLD."Reward" != NEW."Reward" OR OLD."Status" != 'Approved') THEN 
                         UPDATE bounty_programs 
                         SET total_bounties_paid = total_bounties_paid - COALESCE(ABS(OLD."Reward"::NUMERIC), 0) + COALESCE(ABS(NEW."Reward"::NUMERIC), 0)
                         WHERE id_prog = NEW.post_id;
                    END IF;

                    RETURN NEW;
                END IF;
                RETURN NULL;
            END;
            $$ LANGUAGE plpgsql;
        `);

        console.log('5. Applying Trigger...');
        await client.query(`DROP TRIGGER IF EXISTS trigger_update_program_stats ON submit;`);
        await client.query(`
            CREATE TRIGGER trigger_update_program_stats
            AFTER INSERT OR UPDATE OR DELETE ON submit
            FOR EACH ROW EXECUTE FUNCTION update_program_stats();
        `);

        console.log('6. Seeding initial stats (One-time fix)...');
        // We must update existing stats because the trigger only works for new/future changes.
        // We will run a complex update based on existing data.
        await client.query(`
             UPDATE bounty_programs p
             SET 
                total_reports = (SELECT COUNT(*) FROM submit s WHERE s.post_id = p.id_prog),
                pending_reports = (SELECT COUNT(*) FROM submit s WHERE s.post_id = p.id_prog AND s."Status" = 'Pending'),
                approved_reports = (SELECT COUNT(*) FROM submit s WHERE s.post_id = p.id_prog AND s."Status" = 'Approved'),
                rejected_reports = (SELECT COUNT(*) FROM submit s WHERE s.post_id = p.id_prog AND s."Status" IN ('Rejected', 'RejectedW')),
                total_bounties_paid = (SELECT COALESCE(SUM(NULLIF(s."Reward", '')::NUMERIC), 0) FROM submit s WHERE s.post_id = p.id_prog AND s."Status" = 'Approved');
        `);

        await client.query('COMMIT');
        console.log('Migration completed successfully!');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
