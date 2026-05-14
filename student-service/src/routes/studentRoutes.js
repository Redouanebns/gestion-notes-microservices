const express = require('express');
const Student = require('../models/Student');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const router = express.Router();

// Toutes les routes de ce fichier sont protégées.
router.use(authMiddleware);

// POST / — un étudiant peut créer son propre profil, un admin peut créer n'importe quel profil
router.post('/', async (req, res) => {
  try {
    const { role } = req.user;
    
    // Si c'est un enseignant, on refuse
    if (role === 'teacher') {
      return res.status(403).json({ message: 'Les professeurs ne peuvent pas ajouter d\'étudiants. Contactez un administrateur.' });
    }
    
    // Students can only create their own profile (email must match)
    if (role === 'student' && req.body.email !== req.user.email) {
      return res.status(403).json({ message: 'Un étudiant ne peut créer que son propre profil.' });
    }
    const student = await Student.create(req.body);
    res.status(201).json(student);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  const students = await Student.find().sort({ createdAt: -1 });
  res.json(students);
});

router.get('/:id', async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }
  res.json(student);
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }
  res.json(student);
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }
  res.json({ message: 'Student deleted successfully' });
});

module.exports = router;