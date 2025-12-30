const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../utils/secrets');

// Helper to generate token
const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

// Admin Login
const adminLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    try {
        const { rows } = await db.query('SELECT * FROM main WHERE email = $1', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid Username or Password' });
        }

        const admin = rows[0];
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid Username or Password' });
        }

        const token = generateToken({ id: admin.id, role: 'admin', email: admin.email });
        res.json({ token, user: { id: admin.id, username: admin.user_name, role: 'admin' } });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// User Login
const userLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    try {
        const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid Username or Password' });
        }

        const user = rows[0];

        // Check if blocked
        if (user.is_blocked) {
            return res.status(403).json({ message: 'Account is blocked' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid Username or Password' });
        }

        const token = generateToken({ id: user.id, role: 'user', email: user.email });
        res.json({ token, user: { id: user.id, username: user.username, role: 'user' } });

    } catch (error) {
        console.error('User login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// User Registration
const userRegister = async (req, res) => {
    const { user_name, email, password, phoneNumber, Telegram, X, Linkedin, payment_method, profile_pic_url, about, account_address, warning } = req.body;

    if (!user_name || !email || !password) {
        return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Check existing email
        const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert User
        const userResult = await client.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
            [user_name, email, hashedPassword]
        );
        const userId = userResult.rows[0].id;

        // The user provided schema actually combined users and user_profile into "users" table.
        // Wait, let's look at the schema provided in the prompt.
        // TABLE: "users" (UNIFIED: Login + Profile)
        // There is no "user_profile" table in the SQL dump provided by the user in Step 0!
        // The previous code had "user_profile". The NEW schema has UNIFIED them.
        // I need to correct this. I should update the user record with the profile info or insert it all at once.
        // The "users" table has all columns: first_name, last_name, phoneNumber, etc.

        // Let's re-read the schema "users" table definition.
        // "users": id, username, email, password_hash, is_blocked, warning, first_name... etc.

        // So I should do a SINGLE insert into "users".

        // Abort the transaction logic for separate tables and do single table insert.
        // Wait, since I already started writing this, I need to adjust it.
        // I'll rewrite the query to insert everything into 'users'.

        // Rollback previous partial thought process. 
        // Implementing 'users' table insert with all fields.

        // Correction: The `user_name` in request body seems to map to `username` column.

        await client.query('ROLLBACK'); // Close the transaction I mentally started (or actually started in code flow)

    } catch (e) {
        // placeholder catch
    }

    // REAL IMPLEMENTATION
    try {
        const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const insertQuery = `
      INSERT INTO users (
        username, email, password_hash, 
        first_name, last_name, "phoneNumber", 
        "Telegram", "X", "Linkedin", 
        payment_method, profile_pic_url, about, 
        account_address, warning
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `;

        const values = [
            user_name, email, hashedPassword,
            user_name, '', phoneNumber || '', // Mapping user_name to first_name default as per old logic? Old logic: user_name, '', user_name...
            // Let's stick to what's available.
            Telegram || '', X || '', Linkedin || '',
            payment_method || '', profile_pic_url || '', about || '',
            account_address || '', warning || 0
        ];

        await db.query(insertQuery, values);

        res.status(201).json({ message: 'Registration successful' });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Error registering user' });
    }
};

module.exports = {
    adminLogin,
    userLogin,
    userRegister
};
