const db = require('../config/db');

// Get all programs
const getAllPrograms = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM bounty_programs ORDER BY id_prog DESC');
        if (rows.length > 0) {
            res.json(rows);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Error fetching programs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get latest 10 programs
const getLatestPrograms = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT "Title", "Details", "Critical", "Link" FROM bounty_programs ORDER BY id_prog DESC LIMIT 10');
        if (rows.length > 0) {
            res.json(rows);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Error fetching latest programs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get single program
const getProgramById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query('SELECT * FROM bounty_programs WHERE id_prog = $1', [id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ message: 'Program not found' });
        }
    } catch (error) {
        console.error('Error fetching program:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Create program (Admin only)
const createProgram = async (req, res) => {
    const { title, link, icon, details, low, medium, high, critical, out } = req.body;

    try {
        const query = `
      INSERT INTO bounty_programs (
        "Title", "Link", "Icon", "Details", "Low", "Medium", "High", "Critical", "Oout"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id_prog
    `;
        const values = [title, link, icon, details, low, medium, high, critical, out];

        await db.query(query, values);
        res.status(201).json({ message: 'Program created successfully' });
    } catch (error) {
        console.error('Error creating program:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Delete program (Admin only)
const deleteProgram = async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await db.query('DELETE FROM bounty_programs WHERE id_prog = $1', [id]);
        if (rowCount > 0) {
            res.json({ message: 'Program deleted successfully' });
        } else {
            res.status(404).json({ message: 'Program not found' });
        }
    } catch (error) {
        console.error('Error deleting program:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update Program (Admin only)
const updateProgram = async (req, res) => {
    const { id } = req.params;
    const { title, link, icon, details, low, medium, high, critical, out } = req.body;

    try {
        const query = `
      UPDATE bounty_programs 
      SET "Title" = $1, "Link" = $2, "Icon" = $3, "Details" = $4, 
          "Low" = $5, "Medium" = $6, "High" = $7, "Critical" = $8, "Oout" = $9,
          "updated_at" = NOW()
      WHERE id_prog = $10
    `;
        const values = [title, link, icon, details, low, medium, high, critical, out, id];

        const { rowCount } = await db.query(query, values);
        if (rowCount > 0) {
            res.json({ message: 'Program updated successfully' });
        } else {
            res.status(404).json({ message: 'Program not found' });
        }
    } catch (error) {
        console.error('Error updating program:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getAllPrograms,
    getLatestPrograms,
    getProgramById,
    createProgram,
    deleteProgram,
    updateProgram
};
