const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    student_id: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
