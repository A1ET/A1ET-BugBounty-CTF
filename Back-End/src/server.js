const app = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

console.log('Starting server...');
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('PostgreSQL connected...');
});

server.on('error', (err) => {
    console.error('Server error:', err);
});
