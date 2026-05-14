const mongoose = require('mongoose');
// Modèle utilisateur utilisé uniquement par le Auth Service.
// Les autres microservices ne doivent pas accéder directement à cette base.
const userSchema = new mongoose.Schema(
{
name: {
type: String,
required: true,
trim: true
},
email: {
type: String,
required: true,
unique: true,
lowercase: true,
trim: true
},
password: {
type: String,
required: true
},
role: {
type: String,
enum: ['admin', 'teacher', 'student'],
default: 'teacher'
}
},
{ timestamps: true }
);
module.exports = mongoose.model('User', userSchema);