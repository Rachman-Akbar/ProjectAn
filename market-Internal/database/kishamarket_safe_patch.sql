SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `email_verified_at` TIMESTAMP NULL DEFAULT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','seller') NOT NULL DEFAULT 'seller',
  `phone` VARCHAR(30) NULL DEFAULT NULL,
  `department` VARCHAR(150) NULL DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `remember_token` VARCHAR(100) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(170) NOT NULL,
  `description` TEXT NULL,
  `image` VARCHAR(500) NULL DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categories_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `type` ENUM('product','service') NOT NULL DEFAULT 'product',
  `description` LONGTEXT NULL,
  `brand` VARCHAR(100) NULL DEFAULT NULL,
  `images` JSON NULL,
  `rating` DECIMAL(3,1) NOT NULL DEFAULT 0.0,
  `review_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `status` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_variants` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `sku` VARCHAR(100) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `attributes` JSON NULL,
  `track_stock` TINYINT(1) NOT NULL DEFAULT 1,
  `stock` INT UNSIGNED NULL DEFAULT 0,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(100) NOT NULL,
  `guest_name` VARCHAR(120) NOT NULL,
  `guest_division` VARCHAR(150) NOT NULL,
  `guest_phone` VARCHAR(30) NOT NULL,
  `guest_address` TEXT NOT NULL,
  `guest_notes` TEXT NULL,
  `subtotal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('pending','confirmed','processing','completed','cancelled') NOT NULL DEFAULT 'pending',
  `payment_method` ENUM('internal_billing','bank_transfer','cod') NOT NULL DEFAULT 'internal_billing',
  `payment_status` ENUM('unpaid','paid') NOT NULL DEFAULT 'unpaid',
  `cancelled_at` TIMESTAMP NULL DEFAULT NULL,
  `cancel_reason` TEXT NULL,
  `admin_notes` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `product_variant_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `product_sku` VARCHAR(100) NULL DEFAULT NULL,
  `product_type` ENUM('product','service') NOT NULL DEFAULT 'product',
  `variant_name` VARCHAR(255) NULL DEFAULT NULL,
  `variant_attributes` JSON NULL,
  `price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1,
  `subtotal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_status_histories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `from_status` ENUM('pending','confirmed','processing','completed','cancelled') NULL DEFAULT NULL,
  `to_status` ENUM('pending','confirmed','processing','completed','cancelled') NOT NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` VARCHAR(255) NOT NULL,
  `user_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `ip_address` VARCHAR(45) NULL DEFAULT NULL,
  `user_agent` TEXT NULL,
  `payload` LONGTEXT NOT NULL,
  `last_activity` INT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache` (
  `key` VARCHAR(255) NOT NULL,
  `value` MEDIUMTEXT NOT NULL,
  `expiration` INT NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache_locks` (
  `key` VARCHAR(255) NOT NULL,
  `owner` VARCHAR(255) NOT NULL,
  `expiration` INT NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS `km_add_column`;
DELIMITER $$
CREATE PROCEDURE `km_add_column`(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = p_table
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND column_name = p_column
  ) THEN
    SET @km_sql = CONCAT(
      'ALTER TABLE `', REPLACE(p_table, '`', '``'),
      '` ADD COLUMN `', REPLACE(p_column, '`', '``'),
      '` ', p_definition
    );
    PREPARE km_stmt FROM @km_sql;
    EXECUTE km_stmt;
    DEALLOCATE PREPARE km_stmt;
  END IF;
END$$
DELIMITER ;

CALL `km_add_column`('users', 'role', 'ENUM(''admin'',''seller'') NOT NULL DEFAULT ''seller''');
CALL `km_add_column`('users', 'phone', 'VARCHAR(30) NULL DEFAULT NULL');
CALL `km_add_column`('users', 'department', 'VARCHAR(150) NULL DEFAULT NULL');
CALL `km_add_column`('users', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL `km_add_column`('users', 'email_verified_at', 'TIMESTAMP NULL DEFAULT NULL');
CALL `km_add_column`('users', 'remember_token', 'VARCHAR(100) NULL DEFAULT NULL');
CALL `km_add_column`('users', 'created_at', 'TIMESTAMP NULL DEFAULT NULL');
CALL `km_add_column`('users', 'updated_at', 'TIMESTAMP NULL DEFAULT NULL');

CALL `km_add_column`('categories', 'description', 'TEXT NULL');
CALL `km_add_column`('categories', 'image', 'VARCHAR(500) NULL DEFAULT NULL');
CALL `km_add_column`('categories', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL `km_add_column`('categories', 'sort_order', 'INT UNSIGNED NOT NULL DEFAULT 0');
CALL `km_add_column`('categories', 'created_at', 'TIMESTAMP NULL DEFAULT NULL');
CALL `km_add_column`('categories', 'updated_at', 'TIMESTAMP NULL DEFAULT NULL');

CALL `km_add_column`('products', 'category_id', 'BIGINT UNSIGNED NULL DEFAULT NULL');
CALL `km_add_column`('products', 'slug', 'VARCHAR(255) NOT NULL DEFAULT ''''');
CALL `km_add_column`('products', 'type', 'ENUM(''product'',''service'') NOT NULL DEFAULT ''product''');
CALL `km_add_column`('products', 'description', 'LONGTEXT NULL');
CALL `km_add_column`('products', 'brand', 'VARCHAR(100) NULL DEFAULT NULL');
CALL `km_add_column`('products', 'images', 'JSON NULL');
CALL `km_add_column`('products', 'rating', 'DECIMAL(3,1) NOT NULL DEFAULT 0.0');
CALL `km_add_column`('products', 'review_count', 'INT UNSIGNED NOT NULL DEFAULT 0');
CALL `km_add_column`('products', 'status', 'ENUM(''draft'',''published'',''archived'') NOT NULL DEFAULT ''draft''');
CALL `km_add_column`('products', 'is_featured', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL `km_add_column`('products', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL `km_add_column`('products', 'created_at', 'TIMESTAMP NULL DEFAULT NULL');
CALL `km_add_column`('products', 'updated_at', 'TIMESTAMP NULL DEFAULT NULL');

CALL `km_add_column`('product_variants', 'product_id', 'BIGINT UNSIGNED NULL DEFAULT NULL');
CALL `km_add_column`('product_variants', 'sku', 'VARCHAR(100) NOT NULL DEFAULT ''''');
CALL `km_add_column`('product_variants', 'name', 'VARCHAR(255) NOT NULL DEFAULT ''Default''');
CALL `km_add_column`('product_variants', 'price', 'DECIMAL(15,2) NOT NULL DEFAULT 0.00');
CALL `km_add_column`('product_variants', 'attributes', 'JSON NULL');
CALL `km_add_column`('product_variants', 'track_stock', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL `km_add_column`('product_variants', 'stock', 'INT UNSIGNED NULL DEFAULT 0');
CALL `km_add_column`('product_variants', 'is_default', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL `km_add_column`('product_variants', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL `km_add_column`('product_variants', 'created_at', 'TIMESTAMP NULL DEFAULT NULL');
CALL `km_add_column`('product_variants', 'updated_at', 'TIMESTAMP NULL DEFAULT NULL');

CALL `km_add_column`('orders', 'order_number', 'VARCHAR(100) NOT NULL DEFAULT ''''');
CALL `km_add_column`('orders', 'guest_name', 'VARCHAR(120) NOT NULL DEFAULT ''''');
CALL `km_add_column`('orders', 'guest_division', 'VARCHAR(150) NOT NULL DEFAULT ''''');
CALL `km_add_column`('orders', 'guest_phone', 'VARCHAR(30) NOT NULL DEFAULT ''''');
CALL `km_add_column`('orders', 'guest_address', 'TEXT NULL');
CALL `km_add_column`('orders', 'guest_notes', 'TEXT NULL');
CALL `km_add_column`('orders', 'subtotal', 'DECIMAL(15,2) NOT NULL DEFAULT 0.00');
CALL `km_add_column`('orders', 'total_amount', 'DECIMAL(15,2) NOT NULL DEFAULT 0.00');
CALL `km_add_column`('orders', 'status', 'ENUM(''pending'',''confirmed'',''processing'',''completed'',''cancelled'') NOT NULL DEFAULT ''pending''');
CALL `km_add_column`('orders', 'payment_method', 'ENUM(''internal_billing'',''bank_transfer'',''cod'') NOT NULL DEFAULT ''internal_billing''');
CALL `km_add_column`('orders', 'payment_status', 'ENUM(''unpaid'',''paid'') NOT NULL DEFAULT ''unpaid''');
CALL `km_add_column`('orders', 'cancelled_at', 'TIMESTAMP NULL DEFAULT NULL');
CALL `km_add_column`('orders', 'cancel_reason', 'TEXT NULL');
CALL `km_add_column`('orders', 'admin_notes', 'TEXT NULL');
CALL `km_add_column`('orders', 'created_at', 'TIMESTAMP NULL DEFAULT NULL');
CALL `km_add_column`('orders', 'updated_at', 'TIMESTAMP NULL DEFAULT NULL');
CALL `km_add_column`('orders', 'deleted_at', 'TIMESTAMP NULL DEFAULT NULL');

CALL `km_add_column`('order_items', 'order_id', 'BIGINT UNSIGNED NULL DEFAULT NULL');
CALL `km_add_column`('order_items', 'product_id', 'BIGINT UNSIGNED NULL DEFAULT NULL');
CALL `km_add_column`('order_items', 'product_variant_id', 'BIGINT UNSIGNED NULL DEFAULT NULL');
CALL `km_add_column`('order_items', 'product_name', 'VARCHAR(255) NOT NULL DEFAULT ''''');
CALL `km_add_column`('order_items', 'product_sku', 'VARCHAR(100) NULL DEFAULT NULL');
CALL `km_add_column`('order_items', 'product_type', 'ENUM(''product'',''service'') NOT NULL DEFAULT ''product''');
CALL `km_add_column`('order_items', 'variant_name', 'VARCHAR(255) NULL DEFAULT NULL');
CALL `km_add_column`('order_items', 'variant_attributes', 'JSON NULL');
CALL `km_add_column`('order_items', 'price', 'DECIMAL(15,2) NOT NULL DEFAULT 0.00');
CALL `km_add_column`('order_items', 'quantity', 'INT UNSIGNED NOT NULL DEFAULT 1');
CALL `km_add_column`('order_items', 'subtotal', 'DECIMAL(15,2) NOT NULL DEFAULT 0.00');
CALL `km_add_column`('order_items', 'created_at', 'TIMESTAMP NULL DEFAULT NULL');
CALL `km_add_column`('order_items', 'updated_at', 'TIMESTAMP NULL DEFAULT NULL');

CALL `km_add_column`('order_status_histories', 'order_id', 'BIGINT UNSIGNED NULL DEFAULT NULL');
CALL `km_add_column`('order_status_histories', 'user_id', 'BIGINT UNSIGNED NULL DEFAULT NULL');
CALL `km_add_column`('order_status_histories', 'from_status', 'ENUM(''pending'',''confirmed'',''processing'',''completed'',''cancelled'') NULL DEFAULT NULL');
CALL `km_add_column`('order_status_histories', 'to_status', 'ENUM(''pending'',''confirmed'',''processing'',''completed'',''cancelled'') NOT NULL DEFAULT ''pending''');
CALL `km_add_column`('order_status_histories', 'notes', 'TEXT NULL');
CALL `km_add_column`('order_status_histories', 'created_at', 'TIMESTAMP NULL DEFAULT NULL');
CALL `km_add_column`('order_status_histories', 'updated_at', 'TIMESTAMP NULL DEFAULT NULL');

DROP PROCEDURE IF EXISTS `km_add_column`;

INSERT INTO `categories` (`name`, `slug`, `description`, `image`, `is_active`, `sort_order`, `created_at`, `updated_at`)
SELECT 'Umum', 'umum', NULL, NULL, 1, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `categories`);

SET @km_default_category_id = (
  SELECT `id`
  FROM `categories`
  ORDER BY `sort_order`, `id`
  LIMIT 1
);

UPDATE `products`
SET `category_id` = @km_default_category_id
WHERE `category_id` IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM `categories`
     WHERE `categories`.`id` = `products`.`category_id`
   );

UPDATE `products`
SET `slug` = CONCAT('produk-', `id`)
WHERE `slug` IS NULL OR TRIM(`slug`) = '';

UPDATE `products`
SET `images` = JSON_ARRAY()
WHERE `images` IS NULL;

UPDATE `product_variants`
SET `sku` = CONCAT('SKU-', `id`)
WHERE `sku` IS NULL OR TRIM(`sku`) = '';

UPDATE `product_variants`
SET `name` = 'Default'
WHERE `name` IS NULL OR TRIM(`name`) = '';

UPDATE `product_variants`
SET `attributes` = JSON_ARRAY()
WHERE `attributes` IS NULL;

UPDATE `users`
SET `role` = 'admin', `is_active` = 1
WHERE `email` = 'admin@company.local';

INSERT INTO `users` (
  `name`,
  `email`,
  `password`,
  `role`,
  `phone`,
  `department`,
  `is_active`,
  `created_at`,
  `updated_at`
)
SELECT
  'Administrator',
  'admin@company.local',
  '$2y$12$HPpggyEefZsSzCN1F5UUWeNOECVcnjJuYwIkAtN2HWXIBh/avpjdW',
  'admin',
  NULL,
  'Administrator',
  1,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM `users`
  WHERE `email` = 'admin@company.local'
);

SET FOREIGN_KEY_CHECKS = 1;
