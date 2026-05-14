const express = require('express');
const Student = require('../models/Student');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();
// Toutes les routes de ce fichier sont protégées.
router.use(authMiddleware);
router.post('/', async (req, res) => {
try {
const student = await Student.create(req.body);
res.status(201).json(student);
12} catch (error) {
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
router.put('/:id', async (req, res) => {
const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
new: true,
runValidators: true
});
if (!student) {
return res.status(404).json({ message: 'Student not found' });
}
res.json(student);
});
router.delete('/:id', async (req, res) => {
const student = await Student.findByIdAndDelete(req.params.id);
if (!student) {
return res.status(404).json({ message: 'Student not found' });
}
res.json({ message: 'Student deleted successfully' });
});
module.exports = router;