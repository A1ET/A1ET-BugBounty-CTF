const PORT = process.env.PORT || 5000;

// Single file upload
const uploadFile = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Return full URL
        const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
        res.status(200).json({ fileUrl: fileUrl });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
};

// Alternative upload (relative path)
const uploadFileRelative = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ fileUrl });
};

module.exports = {
    uploadFile,
    uploadFileRelative
};
