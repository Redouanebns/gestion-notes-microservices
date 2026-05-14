const mongoose = require('mongoose');
// Connexion à MongoDB.
// L'URL vient du fichier .env afin d'éviter de mettre des informations
// sensibles dans le code.
const connectDB = async () => {
try {
await mongoose.connect(process.env.MONGO_URI);
console.log('Auth Service connected to MongoDB');
} catch (error) {
console.error('MongoDB connection error:', error.message);
process.exit(1);
}
};
module.exports = connectDB;