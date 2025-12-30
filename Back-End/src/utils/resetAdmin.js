const db = require('../config/db');
const bcrypt = require('bcryptjs');

const resetAdminPassword = async () => {
    const email = 'a1etad';
    const newPassword = 'Pass';

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Check if admin exists
        const checkRes = await db.query('SELECT * FROM main WHERE email = $1', [email]);

        if (checkRes.rows.length === 0) {
            console.log('Admin user not found. Creating one...');
            await db.query('INSERT INTO main (user_name, email, password) VALUES ($1, $2, $3)', ['Admin', email, hashedPassword]);
        } else {
            console.log('Admin user found. Updating password...');
            await db.query('UPDATE main SET password = $1 WHERE email = $2', [hashedPassword, email]);
        }

        console.log(`Admin password reset successful.\nEmail: ${email}\nPassword: ${newPassword}`);
        process.exit(0);
    } catch (error) {
        console.error('Error resetting password:', error);
        process.exit(1);
    }
};

resetAdminPassword();
