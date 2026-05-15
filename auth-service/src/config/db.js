const mongoose = require('mongoose');

// Connexion à MongoDB avec retry automatique.
// L'URL vient des variables d'environnement (docker-compose ou .env).
const connectDB = async (retries = 5, delay = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('Auth Service connected to MongoDB');
      return;
    } catch (error) {
      console.error(`MongoDB connection error (attempt ${attempt}/${retries}):`, error.message);
      if (attempt < retries) {
        console.log(`Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error('Could not connect to MongoDB after all retries. Exiting.');
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;