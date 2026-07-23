CREATE DATABASE IF NOT EXISTS `kishamarket_internal`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `kishamarket_internal`;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `order_status_histories`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `product_variants`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `cache_locks`;
DROP TABLE IF EXISTS `cache`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `users` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `email` varchar(255) NOT NULL,
    `password` varchar(255) NOT NULL,
    `role` enum('admin','seller') NOT NULL DEFAULT 'seller',
    `phone` varchar(30) DEFAULT NULL,
    `department` varchar(150) DEFAULT NULL,
    `is_active` tinyint(1) NOT NULL DEFAULT 1,
    `remember_token` varchar(100) DEFAULT NULL,
    `created_at` timestamp NULL DEFAULT NULL,
    `updated_at` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `users_email_unique` (`email`),
    KEY `users_role_index` (`role`),
    KEY `users_is_active_index` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `categories` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `name` varchar(150) NOT NULL,
    `slug` varchar(170) NOT NULL,
    `description` text DEFAULT NULL,
    `image` varchar(255) DEFAULT NULL,
    `is_active` tinyint(1) NOT NULL DEFAULT 1,
    `sort_order` int unsigned NOT NULL DEFAULT 0,
    `created_at` timestamp NULL DEFAULT NULL,
    `updated_at` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `categories_slug_unique` (`slug`),
    KEY `categories_active_sort_index` (`is_active`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `products` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `category_id` bigint unsigned DEFAULT NULL,
    `name` varchar(255) NOT NULL,
    `slug` varchar(255) NOT NULL,
    `type` enum('product','service') NOT NULL DEFAULT 'product',
    `description` longtext DEFAULT NULL,
    `brand` varchar(100) DEFAULT NULL,
    `images` json DEFAULT NULL,
    `rating` decimal(2,1) NOT NULL DEFAULT 0.0,
    `review_count` int unsigned NOT NULL DEFAULT 0,
    `status` enum('draft','published','archived') NOT NULL DEFAULT 'published',
    `is_featured` tinyint(1) NOT NULL DEFAULT 0,
    `is_active` tinyint(1) NOT NULL DEFAULT 1,
    `created_at` timestamp NULL DEFAULT NULL,
    `updated_at` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `products_name_unique` (`name`),
    UNIQUE KEY `products_slug_unique` (`slug`),
    KEY `products_category_status_index` (`category_id`,`status`,`is_active`),
    KEY `products_status_featured_index` (`status`,`is_active`,`is_featured`),
    KEY `products_type_index` (`type`,`is_active`),
    CONSTRAINT `products_category_foreign`
        FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `product_variants` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `product_id` bigint unsigned NOT NULL,
    `sku` varchar(100) NOT NULL,
    `name` varchar(255) NOT NULL,
    `price` decimal(15,2) NOT NULL,
    `attributes` json DEFAULT NULL,
    `track_stock` tinyint(1) NOT NULL DEFAULT 1,
    `stock` int unsigned DEFAULT NULL,
    `is_default` tinyint(1) NOT NULL DEFAULT 0,
    `is_active` tinyint(1) NOT NULL DEFAULT 1,
    `created_at` timestamp NULL DEFAULT NULL,
    `updated_at` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `product_variants_sku_unique` (`sku`),
    UNIQUE KEY `product_variants_product_name_unique` (`product_id`,`name`),
    KEY `product_variants_product_active_default_index` (`product_id`,`is_active`,`is_default`),
    CONSTRAINT `product_variants_product_foreign`
        FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `orders` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `order_number` varchar(100) NOT NULL,
    `guest_name` varchar(120) NOT NULL,
    `guest_division` varchar(150) NOT NULL,
    `guest_phone` varchar(30) NOT NULL,
    `guest_address` text NOT NULL,
    `guest_notes` text DEFAULT NULL,
    `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
    `total_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
    `status` enum('pending','confirmed','processing','completed','cancelled') NOT NULL DEFAULT 'pending',
    `payment_method` enum('cod','bank_transfer','internal_billing') NOT NULL DEFAULT 'internal_billing',
    `payment_status` enum('unpaid','paid') NOT NULL DEFAULT 'unpaid',
    `cancelled_at` timestamp NULL DEFAULT NULL,
    `cancel_reason` text DEFAULT NULL,
    `admin_notes` text DEFAULT NULL,
    `deleted_at` timestamp NULL DEFAULT NULL,
    `created_at` timestamp NULL DEFAULT NULL,
    `updated_at` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `orders_order_number_unique` (`order_number`),
    KEY `orders_guest_phone_index` (`guest_phone`),
    KEY `orders_status_created_index` (`status`,`created_at`),
    KEY `orders_payment_created_index` (`payment_status`,`created_at`),
    KEY `orders_deleted_created_index` (`deleted_at`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `order_items` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `order_id` bigint unsigned NOT NULL,
    `product_id` bigint unsigned DEFAULT NULL,
    `product_variant_id` bigint unsigned DEFAULT NULL,
    `product_name` varchar(255) NOT NULL,
    `product_sku` varchar(100) NOT NULL,
    `product_type` enum('product','service') NOT NULL DEFAULT 'product',
    `variant_name` varchar(255) NOT NULL,
    `variant_attributes` json DEFAULT NULL,
    `price` decimal(15,2) NOT NULL,
    `quantity` int unsigned NOT NULL,
    `subtotal` decimal(15,2) NOT NULL,
    `created_at` timestamp NULL DEFAULT NULL,
    `updated_at` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `order_items_product_id_index` (`product_id`),
    KEY `order_items_product_variant_id_index` (`product_variant_id`),
    CONSTRAINT `order_items_order_foreign`
        FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
    CONSTRAINT `order_items_product_foreign`
        FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
    CONSTRAINT `order_items_variant_foreign`
        FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `order_status_histories` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `order_id` bigint unsigned NOT NULL,
    `changed_by` bigint unsigned DEFAULT NULL,
    `from_status` varchar(30) DEFAULT NULL,
    `to_status` varchar(30) NOT NULL,
    `notes` text DEFAULT NULL,
    `created_at` timestamp NULL DEFAULT NULL,
    `updated_at` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `order_status_histories_order_created_index` (`order_id`,`created_at`),
    KEY `order_status_histories_changed_by_index` (`changed_by`),
    CONSTRAINT `order_status_histories_order_foreign`
        FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
    CONSTRAINT `order_status_histories_user_foreign`
        FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sessions` (
    `id` varchar(255) NOT NULL,
    `user_id` bigint unsigned DEFAULT NULL,
    `ip_address` varchar(45) DEFAULT NULL,
    `user_agent` text DEFAULT NULL,
    `payload` longtext NOT NULL,
    `last_activity` int NOT NULL,
    PRIMARY KEY (`id`),
    KEY `sessions_user_id_index` (`user_id`),
    KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cache` (
    `key` varchar(255) NOT NULL,
    `value` mediumtext NOT NULL,
    `expiration` int NOT NULL,
    PRIMARY KEY (`key`),
    KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cache_locks` (
    `key` varchar(255) NOT NULL,
    `owner` varchar(255) NOT NULL,
    `expiration` int NOT NULL,
    PRIMARY KEY (`key`),
    KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
