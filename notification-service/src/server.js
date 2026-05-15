const express = require('express');
const amqp = require('amqplib');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const Notification = require('./models/Notification');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const QUEUE = 'grade_created';

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gestion_notes_notifications').then(() => console.log('Connected to MongoDB (Notifications)'))
  .catch(err => console.error('MongoDB connection error:', err));

async function startConsumer() {
    try {
        // Connect to RabbitMQ
        const connection = await amqp.connect(
            process.env.RABBITMQ_URL || 'amqp://localhost'
        );

        // Create channel
        const channel = await connection.createChannel();

        // Declare queue
        await channel.assertQueue(QUEUE, {
            durable: true
        });

        console.log(
            `Notification Service waiting for messages in queue: ${QUEUE}`
        );

        // Consume messages
        channel.consume(QUEUE, async (msg) => {

            if (msg !== null) {

                const content = JSON.parse(
                    msg.content.toString()
                );

                console.log('New notification received:');
                console.log(
                    `Student ${content.student_id} received grade ${content.grade} in ${content.subject}`
                );

                // Save to MongoDB
                try {
                    await Notification.create({
                        student_id: content.student_id,
                        message: `Vous avez reçu une nouvelle note (${content.grade}/20) en ${content.subject}.`
                    });
                    console.log('Notification saved to database');
                } catch (dbErr) {
                    console.error('Failed to save notification:', dbErr);
                }

                channel.ack(msg);
            }
        });

    } catch (error) {

        console.error(
            'RabbitMQ connection error:',
            error.message
        );

        // Automatic reconnection after 5 seconds
        setTimeout(startConsumer, 5000);
    }
}

// Routes
app.get('/health', (req, res) => {
    res.json({
        service: 'notification-service',
        status: 'OK'
    });
});

app.get('/api/notifications/:student_id', async (req, res) => {
    try {
        const notifications = await Notification.find({ student_id: req.params.student_id }).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 4004;

app.listen(PORT, () => {
    console.log(
        `Notification Service running on port ${PORT}`
    );
    startConsumer();
});