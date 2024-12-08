const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();

// Route to retrieve a user by their ID.
router.get('/user/:userId', (req, res) => {
  const db = new sqlite3.Database(req.app.get('config').DATABASE);
  const userId = req.params.userId;

  // Validate that a user ID is provided.
  if (!userId) {
    res.status(400).json({ error: 'User ID is required' });
    return;
  }

  // Execute an SQL query to fetch the user from the database.
  db.get('SELECT * FORM users WHERE id = ?', [userId], (err, user) => {
    db.close();

    // Handle potential errors during the database query.
    if (err) {
      res.status(500).json({ error: 'Database error' }); //Generic error response to client
      return;
    }

    // Check if a user with the given ID was found.
    if (user) {
      res.json({ id: user.id, name: user.name, email: user.email });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  });
});

// Route to create a new user.
router.post('/user/', (req, res) => {
  const db = new sqlite3.Database(req.app.get('config').DATABASE);
  const { name, email } = req.body;

  // Input validation
  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required' });
    return;
  }

  // Execute an SQL query to insert a new user into the database.
  db.run('INSERT INTO users (name, email) VALUES (?, ?)', [name, email], function(err) {
    db.close();

    // Handle potential errors during the database insertion.
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Return a 201 Created response with the ID of the newly created user.
    res.status(201).json({ message: 'User created', id: this.lastID });
  });
});

module.exports = router;
