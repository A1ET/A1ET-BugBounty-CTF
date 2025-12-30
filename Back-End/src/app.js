const express = require('express');
const cors = require('cors');
const path = require('path');
const uploadMiddleware = require('./middleware/uploadMiddleware');
const uploadController = require('./controllers/uploadController');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const programRoutes = require('./routes/programRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' })); // Body parser with increased limit
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/', authRoutes); // Auth routes at root level based on legacy (e.g. /login)
app.use('/', programRoutes);
app.use('/', submissionRoutes);
app.use('/', userRoutes);

// Upload Routes (Directly in app.js or separate route file? Keeping simple as per previous server.js)
app.post('/upload', uploadMiddleware.single('file'), uploadController.uploadFile);
app.post('/upload_file', uploadMiddleware.single('file'), uploadController.uploadFileRelative);

// Health Check
app.get('/', (req, res) => {
    res.send('API is running...');
});

module.exports = app;
