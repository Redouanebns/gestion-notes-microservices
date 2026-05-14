const express = require('express');
const amqp = require('amqplib');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(express.json());

const QUEUE = 'grade_created';

async function startConsumer() {
    try {
        // Connect to RabbitMQ
        const connection = await amqp.connect(
            process.env.RABBITMQ_URL
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

                // Here we could send:
                // - Email
                // - SMS
                // - Web notification
                // For this workshop we only simulate sending

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

// Health route
app.get('/health', (req, res) => {
    res.json({
        service: 'notification-service',
        status: 'OK'
    });
});

// Start server
const PORT = process.env.PORT || 4004;

app.listen(PORT, () => {

    console.log(
        `Notification Service running on port ${PORT}`
    );

    startConsumer();
});