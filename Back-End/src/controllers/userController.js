const db = require('../config/db');

// Get all users (Admin)
const getAllUsers = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, username, email, "profile_pic_url", "Total_Reward", "is_blocked" FROM users ORDER BY id DESC');
        if (rows.length > 0) res.json(rows);
        else res.status(404).json({ message: 'No entries found' });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get User Profile (Self)
const getMyProfile = async (req, res) => {
    const userId = req.user.id;
    try {
        const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (rows.length > 0) {
            // Remove sensitive data like password_hash
            const user = rows[0];
            delete user.password_hash;
            res.json(user);
        } else {
            res.status(404).json({ message: 'Profile not found' });
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update Profile
const updateProfile = async (req, res) => {
    const userId = req.user.id;
    const { first_name, last_name, username, email, phoneNumber, Telegram, X, Linkedin, payment_method, profile_pic_url, about, account_address, warning } = req.body;

    try {
        const query = `
      UPDATE users SET
        first_name = $1, last_name = $2, username = $3, email = $4,
        "phoneNumber" = $5, "Telegram" = $6, "X" = $7, "Linkedin" = $8,
        payment_method = $9, profile_pic_url = $10, about = $11, account_address = $12,
        updated_at = NOW()
      WHERE id = $13
    `;
        // Note: warning allows update? Typically admin only. Restricting it here to not update warning from user side.

        const values = [
            first_name, last_name, username, email,
            phoneNumber, Telegram, X, Linkedin,
            payment_method, profile_pic_url, about, account_address,
            userId
        ];

        await db.query(query, values);
        res.status(200).json({ message: 'Profile updated successfully!' });

    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get User Details (Admin or Public?)
// Get User Details (Admin View)
const getUserDetails = async (req, res) => {
    const { id } = req.params;
    try {
        // Select all relevant fields for admin view
        const query = `
            SELECT id, username, email, first_name, last_name, "phoneNumber", 
            "Telegram", "X", "Linkedin", payment_method, profile_pic_url, about, 
            account_address, "Total_Reward", warning, is_blocked, created_at 
            FROM users WHERE id = $1
        `;
        const { rows } = await db.query(query, [id]);
        if (rows.length > 0) res.json(rows[0]);
        else res.status(404).json({ message: 'User not found' });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Block/Unblock User (Admin)
const blockUser = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE users SET is_blocked = TRUE WHERE id = $1', [id]);
        res.json({ message: 'User Blocked successfully' });
    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const unblockUser = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE users SET is_blocked = FALSE WHERE id = $1', [id]);
        res.json({ message: 'User Unblocked successfully' });
    } catch (error) {
        console.error('Error unblocking user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const countUsers = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT COUNT(*) AS count FROM users');
        res.json({ count: rows[0].count });
    } catch (error) {
        console.error('Error counting users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getNotifications = async (req, res) => {
    const userId = req.user.id;
    try {
        const { rows } = await db.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const markNotificationsRead = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.body;

    try {
        if (id) {
            await db.query(
                'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
                [id, userId]
            );
        } else {
            await db.query(
                'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
                [userId]
            );
        }
        res.json({ message: 'Notifications marked as read' });
    } catch (error) {
        console.error('Error marking notifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getAllUsers,
    getMyProfile,
    updateProfile,
    getUserDetails,
    blockUser,
    unblockUser,
    countUsers,
    getNotifications,
    markNotificationsRead
};
