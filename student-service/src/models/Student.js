const mongoose = require('mongoose');
const studentSchema = new mongoose.Schema(
{
firstName: {
type: String,
required: true,
trim: true
},
lastName: {
type: String,
required: true,
trim: true
},
email: {
type: String,
required: true,
unique: true,
lowercase: true
},
level: {
type: String,
required: true
},
registrationNumber: {
type: String,
required: true,
unique: true
},
enrolledSubjects: [{
type: String
}]
},
{ timestamps: true }
);
module.exports = mongoose.model('Student', studentSchema);