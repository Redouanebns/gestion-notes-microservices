<?php

namespace App\Services;

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

class RabbitMQPublisher
{
    public function publish(string $queue, array $payload): void
    {
        // Create RabbitMQ connection
        $connection = new AMQPStreamConnection(
            env('RABBITMQ_HOST', '127.0.0.1'),
            env('RABBITMQ_PORT', 5672),
            env('RABBITMQ_USER', 'guest'),
            env('RABBITMQ_PASSWORD', 'guest')
        );

        // Open channel
        $channel = $connection->channel();

        // Declare queue
        $channel->queue_declare(
            $queue,
            false,
            true,
            false,
            false
        );

        // Create message
        $message = new AMQPMessage(
            json_encode($payload),
            [
                'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT
            ]
        );

        // Publish message
        $channel->basic_publish($message, '', $queue);

        // Close channel and connection
        $channel->close();
        $connection->close();
    }
}