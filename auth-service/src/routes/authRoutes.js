const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();
// POST /api/auth/register
// Crée un nouvel utilisateur.
router.post('/register', async (req, res) => {
try {
const { name, email, password, role } = req.body;
if (!name || !email || !password) {
return res.status(400).json({ message: 'Name, email and password are required' });
}
const existingUser = await User.findOne({ email });
if (existingUser) {
return res.status(409).json({ message: 'Email already exists' });
}
// Hachage du mot de passe avant stockage.
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(password, salt);
const user = await User.create({
name,
email,
password: hashedPassword,
role
});
res.status(201).json({
message: 'User created successfully',
user: {
id: user._id,
name: user.name,
email: user.email,
role: user.role
}
});
} catch (error) {
res.status(500).json({ message: 'Server error', error: error.message });
}
});
// POST /api/auth/login
// Vérifie les identifiants puis retourne un token JWT.
router.post('/login', async (req, res) => {
try {
const { email, password } = req.body;
const user = await User.findOne({ email });
if (!user) {
return res.status(401).json({ message: 'Invalid credentials' });
}
const isMatch = await bcrypt.compare(password, user.password);
if (!isMatch) {
return res.status(401).json({ message: 'Invalid credentials' });
}
const token = jwt.sign(
{
id: user._id,
email: user.email,
role: user.role
},
process.env.JWT_SECRET,
{ expiresIn: '2h' }
);
res.json({
message: 'Login successful',
token,
user: {
id: user._id,
name: user.name,
email: user.email,
role: user.role
}
});
} catch (error) {
res.status(500).json({ message: 'Server error', error: error.message });
}
});
// GET /api/auth/profile
// Route protégée par JWT.
router.get('/profile', authMiddleware, async (req, res) => {
res.json({
message: 'Protected profile route',
user: req.user
});
});

module.exports = router;