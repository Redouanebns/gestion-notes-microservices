FROM php:8.2-fpm-alpine

# Install system dependencies and PHP extensions
RUN apk add --no-cache linux-headers libpng-dev libzip-dev zip unzip git \
    && docker-php-ext-install pdo_mysql sockets bcmath

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy application files
COPY . .

# Install dependencies
RUN composer install --no-dev --optimize-autoloader

# Expose port 4003 for artisan serve
EXPOSE 4003

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=4003"]
