USE `kishamarket_internal`;

INSERT INTO `users`
(`id`,`name`,`email`,`password`,`role`,`phone`,`department`,`is_active`,`created_at`,`updated_at`)
VALUES
(1,'Administrator','admin@company.local','$2y$12$bDHrcrHoXclWYxnX1sP2detBdjRTDYSOj8H9H0YVX5Zr0ba5WjjPW','admin','081200000001','Management Support',1,NOW(),NOW()),
(2,'Internal Seller','seller@company.local','$2y$12$ezHUH3BMtvxeGVQWtTAPNO.XLgL/QznHaXGudXLjwvW2sHr0kqy/G','seller','081200000002','Procurement',1,NOW(),NOW());

INSERT INTO `categories`
(`id`,`name`,`slug`,`description`,`is_active`,`sort_order`,`created_at`,`updated_at`)
VALUES
(1,'Peralatan Kantor','peralatan-kantor','Peralatan penunjang aktivitas kantor.',1,1,NOW(),NOW()),
(2,'Teknologi','teknologi','Perangkat teknologi internal.',1,2,NOW(),NOW()),
(3,'Layanan Internal','layanan-internal','Layanan yang disediakan unit internal.',1,3,NOW(),NOW()),
(4,'Seragam','seragam','Seragam dan kebutuhan operasional karyawan.',1,4,NOW(),NOW());

INSERT INTO `products`
(`id`,`category_id`,`name`,`slug`,`type`,`description`,`brand`,`images`,`rating`,`review_count`,`status`,`is_featured`,`is_active`,`created_at`,`updated_at`)
VALUES
(1,1,'Kursi Kerja Ergonomis','kursi-kerja-ergonomis','product','Kursi kerja ergonomis untuk kebutuhan operasional kantor.','Internal Office',JSON_ARRAY('https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80'),4.8,32,'published',1,1,NOW(),NOW()),
(2,4,'Kaos Operasional','kaos-operasional','product','Kaos operasional dengan pilihan warna dan ukuran.','Kisha Uniform',JSON_ARRAY('https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80'),4.7,18,'published',1,1,NOW(),NOW()),
(3,3,'Instalasi Perangkat Kerja','instalasi-perangkat-kerja','service','Layanan instalasi dan konfigurasi perangkat kerja oleh tim internal.',NULL,JSON_ARRAY('https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=900&q=80'),5.0,9,'published',1,1,NOW(),NOW());

INSERT INTO `product_variants`
(`id`,`product_id`,`sku`,`name`,`price`,`attributes`,`track_stock`,`stock`,`is_default`,`is_active`,`created_at`,`updated_at`)
VALUES
(1,1,'OFF-CHAIR-001','Default',1250000.00,JSON_ARRAY(),1,20,1,1,NOW(),NOW()),
(2,2,'UNIFORM-BLK-M','Hitam / M',85000.00,JSON_ARRAY(JSON_OBJECT('name','Warna','value','Hitam'),JSON_OBJECT('name','Ukuran','value','M')),1,25,1,1,NOW(),NOW()),
(3,2,'UNIFORM-BLK-L','Hitam / L',85000.00,JSON_ARRAY(JSON_OBJECT('name','Warna','value','Hitam'),JSON_OBJECT('name','Ukuran','value','L')),1,20,0,1,NOW(),NOW()),
(4,2,'UNIFORM-GRN-M','Hijau / M',90000.00,JSON_ARRAY(JSON_OBJECT('name','Warna','value','Hijau'),JSON_OBJECT('name','Ukuran','value','M')),1,18,0,1,NOW(),NOW()),
(5,2,'UNIFORM-GRN-L','Hijau / L',90000.00,JSON_ARRAY(JSON_OBJECT('name','Warna','value','Hijau'),JSON_OBJECT('name','Ukuran','value','L')),1,15,0,1,NOW(),NOW()),
(6,3,'SRV-INSTALL-001','Default',250000.00,JSON_ARRAY(),0,NULL,1,1,NOW(),NOW());
