const db = require('../config/db');

// Submit a new report
const createSubmission = async (req, res) => {
    const { id_prog } = req.params;
    const { title, end_point, user_id, weakness, types, score, cvss, proof, impact, recommended, files } = req.body;

    if (!title || !end_point || !proof || !impact) {
        return res.status(400).json({ message: 'All form data fields are required' });
    }

    try {
        const query = `
      INSERT INTO submit (
        "Title", "user_id", "post_id", "End_point", "Weakness", "Types", "Score", "Cvss", "Proof", "Impact", "Recommended", "Files", "Status"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Pending')
    `;

        const values = [
            title, user_id, id_prog, end_point,
            weakness || null, types || null, score || null, cvss || null,
            proof, impact, recommended || null, files && files.length > 0 ? files : null
        ];

        await db.query(query, values);
        res.status(200).json({ message: 'Report submitted successfully' });

    } catch (error) {
        console.error('Error creating submission:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get all reports (Admin)
const getAllSubmissions = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM submit ORDER BY id DESC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get pending submissions (Admin)
const getPendingSubmissions = async (req, res) => {
    try {
        const query = `
            SELECT s.id, s."Title", s."End_point", s."Weakness", s."Score", s.created_at, 
                   u.username as reporter_name, u.profile_pic_url, p."Title" as program_title, p."Icon" as program_icon
            FROM submit s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN bounty_programs p ON s.post_id = p.id_prog
            WHERE s."Status" = 'Pending'
            ORDER BY s.id ASC
        `;
        const { rows } = await db.query(query);
        if (rows.length > 0) res.json(rows);
        else res.status(404).json({ message: 'No entries found' });
    } catch (error) {
        console.error('Error fetching pending submissions:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get history (Approved/Rejected)
const getSubmissionHistory = async (req, res) => {
    try {
        const query = `
            SELECT s.id, s."Title", s."End_point", s."Weakness", s."Reward", s."Score", s."Status", s.created_at,
                   u.username as reporter_name, u.profile_pic_url, p."Title" as program_title, p."Icon" as program_icon
            FROM submit s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN bounty_programs p ON s.post_id = p.id_prog
            WHERE s."Status" IN ('Rejected', 'Approved', 'RejectedW')
            ORDER BY s.id DESC
        `;
        const { rows } = await db.query(query);
        if (rows.length > 0) res.json(rows);
        else res.json([]);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get report details
// Get report details with User Info
const getSubmissionById = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT s.*, s.created_at, u.username, u.email, u.profile_pic_url, u."Total_Reward" as user_total_reward, u.warning as user_warning, u.is_blocked as user_blocked
            FROM submit s
            LEFT JOIN users u ON s.user_id = u.id
            WHERE s.id = $1
        `;
        const { rows } = await db.query(query, [id]);
        if (rows.length > 0) res.json(rows[0]);
        else res.status(404).json({ message: 'Report not found' });
    } catch (error) {
        console.error('Error fetching report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get my reports
const getMyReports = async (req, res) => {
    const userId = req.user.id;
    try {
        const { rows } = await db.query('SELECT id, "Title", "End_point", "Weakness", "Types", "Reward", "Score", "Status" FROM submit WHERE user_id = $1 ORDER BY id DESC', [userId]);
        if (rows.length > 0) res.json(rows);
        else res.status(404).json({ message: 'No entries found' });
    } catch (error) {
        console.error('Error fetching user reports:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update Status (Admin) - Accept/Reject logic
const updateStatus = async (req, res) => {
    const { id } = req.params;
    const { status, rewardAmount } = req.body; // Expecting status: 'Approved', 'Rejected', 'RejectedW'

    // Handling complex logic from original server.js
    // 'Approved' -> Update status, reward, add to user total.
    // 'Rejected' -> Update status, increment user warning.
    // 'RejectedW' -> Update status only (no strike).

    // NOTE: In original code, these were separate GET/POST endpoints. I'm consolidating or keeping separate for now?
    // User asked for "Best Practice". RESTful would suggest PUT/PATCH on /submissions/:id
    // But let's stick to specific actions for clarity if logic differs wildly.
    // Actually, let's implement the specific logic functions as requested by the original endpoints logic but cleaner.
};

const approveSubmission = async (req, res) => {
    const { id } = req.params;
    const { rewardAmount } = req.body;
    const adminId = req.user ? req.user.id : null; // Assuming authMiddleware populates req.user

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Update Submit status
        const updateRes = await client.query('UPDATE submit SET "Status" = \'Approved\', "Reward" = $1 WHERE id = $2 RETURNING user_id, "Title"', [rewardAmount, id]);

        if (updateRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Submission not found' });
        }

        const { user_id: userId, Title: reportTitle } = updateRes.rows[0];

        // Update User Total Reward
        const userRes = await client.query('SELECT "Total_Reward" FROM users WHERE id = $1', [userId]);

        if (userRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'User not found' });
        }

        const currentReward = parseFloat(userRes.rows[0].Total_Reward || 0);
        const newTotal = currentReward + parseFloat(rewardAmount);

        await client.query('UPDATE users SET "Total_Reward" = $1 WHERE id = $2', [newTotal, userId]);

        // Audit Log
        if (adminId) {
            await client.query(
                'INSERT INTO audit_logs (actor_id, action, target_id, details) VALUES ($1, $2, $3, $4)',
                [adminId, 'APPROVE_REPORT', id, JSON.stringify({ reward: rewardAmount, title: reportTitle })]
            );
        }

        // Notification
        await client.query(
            'INSERT INTO notifications (user_id, type, message, link) VALUES ($1, $2, $3, $4)',
            [userId, 'REPORT_UPDATE', `Your report "${reportTitle}" has been approved! Reward: $${rewardAmount}`, '/dashboard']
        );

        await client.query('COMMIT');
        res.json({ message: 'Approved and reward updated' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error approving submission:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
};

const rejectSubmissionWithStrike = async (req, res) => {
    const { id } = req.params;
    const adminId = req.user ? req.user.id : null;

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const updateRes = await client.query('UPDATE submit SET "Status" = \'Rejected\' WHERE id = $1 RETURNING user_id, "Title"', [id]);

        if (updateRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Submission not found' });
        }

        const { user_id: userId, Title: reportTitle } = updateRes.rows[0];

        // Update warning on users table
        const warnRes = await client.query('UPDATE users SET warning = warning + 1 WHERE id = $1 RETURNING warning', [userId]);

        if (warnRes.rows.length > 0 && warnRes.rows[0].warning >= 3) {
            // Block user
            await client.query('UPDATE users SET is_blocked = TRUE WHERE id = $1', [userId]);
            // Audit Block
            if (adminId) {
                await client.query(
                    'INSERT INTO audit_logs (actor_id, action, target_id, details) VALUES ($1, $2, $3, $4)',
                    [adminId, 'BLOCK_USER', userId, JSON.stringify({ reason: 'Automatic block: 3 strikes' })]
                );
            }
        }

        // Audit Log
        if (adminId) {
            await client.query(
                'INSERT INTO audit_logs (actor_id, action, target_id, details) VALUES ($1, $2, $3, $4)',
                [adminId, 'REJECT_STRIKE', id, JSON.stringify({ title: reportTitle })]
            );
        }

        // Notification
        await client.query(
            'INSERT INTO notifications (user_id, type, message, link) VALUES ($1, $2, $3, $4)',
            [userId, 'REPORT_UPDATE', `Your report "${reportTitle}" was rejected. A warning strike has been issued.`, '/dashboard']
        );

        await client.query('COMMIT');
        res.json({ message: 'Rejected and warning issued' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error rejecting submission:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
};

const rejectSubmissionNoStrike = async (req, res) => {
    const { id } = req.params;
    const adminId = req.user ? req.user.id : null;

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const updateRes = await client.query('UPDATE submit SET "Status" = \'RejectedW\' WHERE id = $1 RETURNING user_id, "Title"', [id]);

        if (updateRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Submission not found' });
        }

        const { user_id: userId, Title: reportTitle } = updateRes.rows[0];

        // Audit Log
        if (adminId) {
            await client.query(
                'INSERT INTO audit_logs (actor_id, action, target_id, details) VALUES ($1, $2, $3, $4)',
                [adminId, 'REJECT_SAFE', id, JSON.stringify({ title: reportTitle })]
            );
        }

        // Notification
        await client.query(
            'INSERT INTO notifications (user_id, type, message, link) VALUES ($1, $2, $3, $4)',
            [userId, 'REPORT_UPDATE', `Your report "${reportTitle}" was rejected (No strike).`, '/dashboard']
        );

        await client.query('COMMIT');
        res.json({ message: 'Rejected (no strike)' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error rejecting submission:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
};

const deleteSubmission = async (req, res) => {
    const { id } = req.params;
    const adminId = req.user ? req.user.id : null;

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Get details before delete for audit
        const getRes = await client.query('SELECT "Title" FROM submit WHERE id = $1', [id]);
        const title = getRes.rows[0]?.Title || 'Unknown';

        const { rowCount } = await client.query('DELETE FROM submit WHERE id = $1', [id]);

        if (rowCount > 0) {
            if (adminId) {
                await client.query(
                    'INSERT INTO audit_logs (actor_id, action, target_id, details) VALUES ($1, $2, $3, $4)',
                    [adminId, 'DELETE_REPORT', id, JSON.stringify({ title: title })]
                );
            }
            await client.query('COMMIT');
            res.json({ message: 'Deleted successfully' });
        } else {
            await client.query('ROLLBACK');
            res.status(404).json({ message: 'Submission not found' });
        }
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting submission:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
};


module.exports = {
    createSubmission,
    getAllSubmissions,
    getPendingSubmissions,
    getSubmissionHistory,
    getSubmissionById,
    getMyReports,
    approveSubmission,
    rejectSubmissionWithStrike,
    rejectSubmissionNoStrike,
    deleteSubmission
};
