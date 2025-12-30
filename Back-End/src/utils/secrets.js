require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("No JWT secret string. Set JWT_SECRET environment variable.");
    process.exit(1);
}

module.exports = {
    JWT_SECRET
};
