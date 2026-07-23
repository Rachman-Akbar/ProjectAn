<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Seeder;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $categories = collect([
            ['name' => 'Peralatan Kantor', 'slug' => 'peralatan-kantor', 'sort_order' => 1],
            ['name' => 'Teknologi', 'slug' => 'teknologi', 'sort_order' => 2],
            ['name' => 'Layanan Internal', 'slug' => 'layanan-internal', 'sort_order' => 3],
            ['name' => 'Seragam', 'slug' => 'seragam', 'sort_order' => 4],
        ])->mapWithKeys(function (array $data): array {
            $category = Category::query()->updateOrCreate(
                ['slug' => $data['slug']],
                [...$data, 'is_active' => true]
            );

            return [$data['slug'] => $category];
        });

        $chair = Product::query()->updateOrCreate(
            ['slug' => 'kursi-kerja-ergonomis'],
            [
                'category_id' => $categories['peralatan-kantor']->id,
                'name' => 'Kursi Kerja Ergonomis',
                'type' => 'product',
                'description' => 'Kursi kerja ergonomis untuk kebutuhan operasional kantor.',
                'brand' => 'Internal Office',
                'images' => ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80'],
                'rating' => 4.8,
                'review_count' => 32,
                'status' => 'published',
                'is_featured' => true,
                'is_active' => true,
            ]
        );
        ProductVariant::query()->updateOrCreate(
            ['sku' => 'OFF-CHAIR-001'],
            [
                'product_id' => $chair->id,
                'name' => 'Default',
                'price' => 1250000,
                'attributes' => [],
                'track_stock' => true,
                'stock' => 20,
                'is_default' => true,
                'is_active' => true,
            ]
        );

        $shirt = Product::query()->updateOrCreate(
            ['slug' => 'kaos-operasional'],
            [
                'category_id' => $categories['seragam']->id,
                'name' => 'Kaos Operasional',
                'type' => 'product',
                'description' => 'Kaos operasional dengan pilihan warna dan ukuran.',
                'brand' => 'Kisha Uniform',
                'images' => ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80'],
                'rating' => 4.7,
                'review_count' => 18,
                'status' => 'published',
                'is_featured' => true,
                'is_active' => true,
            ]
        );

        foreach ([
            ['sku' => 'UNIFORM-BLK-M', 'name' => 'Hitam / M', 'price' => 85000, 'stock' => 25, 'default' => true, 'attributes' => [['name' => 'Warna', 'value' => 'Hitam'], ['name' => 'Ukuran', 'value' => 'M']]],
            ['sku' => 'UNIFORM-BLK-L', 'name' => 'Hitam / L', 'price' => 85000, 'stock' => 20, 'default' => false, 'attributes' => [['name' => 'Warna', 'value' => 'Hitam'], ['name' => 'Ukuran', 'value' => 'L']]],
            ['sku' => 'UNIFORM-GRN-M', 'name' => 'Hijau / M', 'price' => 90000, 'stock' => 18, 'default' => false, 'attributes' => [['name' => 'Warna', 'value' => 'Hijau'], ['name' => 'Ukuran', 'value' => 'M']]],
            ['sku' => 'UNIFORM-GRN-L', 'name' => 'Hijau / L', 'price' => 90000, 'stock' => 15, 'default' => false, 'attributes' => [['name' => 'Warna', 'value' => 'Hijau'], ['name' => 'Ukuran', 'value' => 'L']]],
        ] as $data) {
            ProductVariant::query()->updateOrCreate(
                ['sku' => $data['sku']],
                [
                    'product_id' => $shirt->id,
                    'name' => $data['name'],
                    'price' => $data['price'],
                    'attributes' => $data['attributes'],
                    'track_stock' => true,
                    'stock' => $data['stock'],
                    'is_default' => $data['default'],
                    'is_active' => true,
                ]
            );
        }

        $service = Product::query()->updateOrCreate(
            ['slug' => 'instalasi-perangkat-kerja'],
            [
                'category_id' => $categories['layanan-internal']->id,
                'name' => 'Instalasi Perangkat Kerja',
                'type' => 'service',
                'description' => 'Layanan instalasi dan konfigurasi perangkat kerja oleh tim internal.',
                'brand' => null,
                'images' => ['https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=900&q=80'],
                'rating' => 5,
                'review_count' => 9,
                'status' => 'published',
                'is_featured' => true,
                'is_active' => true,
            ]
        );
        ProductVariant::query()->updateOrCreate(
            ['sku' => 'SRV-INSTALL-001'],
            [
                'product_id' => $service->id,
                'name' => 'Default',
                'price' => 250000,
                'attributes' => [],
                'track_stock' => false,
                'stock' => null,
                'is_default' => true,
                'is_active' => true,
            ]
        );
    }
}
