const { pool } = require('../config/db');

async function insertTestNotification() {
    const userId = 1; // Assuming admin/first user
    const message = "Test Notification: Report Approved!";
    const type = "SYSTEM";
    const link = "/dashboard";

    try {
        const res = await pool.query(
            `INSERT INTO notifications (user_id, type, message, link) VALUES ($1, $2, $3, $4) RETURNING *`,
            [userId, type, message, link]
        );
        console.log("Inserted notification:", res.rows[0]);
    } catch (err) {
        console.error("Error inserting notification:", err);
    } finally {
        pool.end();
    }
}

insertTestNotification();
