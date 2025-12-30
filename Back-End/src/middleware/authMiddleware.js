const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../utils/secrets');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // EXPECTED FORMAT: "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id: 1, role: 'admin' | 'user' }
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid token.' });
    }
};

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRoles
};
