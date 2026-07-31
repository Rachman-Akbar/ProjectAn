<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MarketplaceSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $this->seedUsers();

            $categories = $this->seedCategories();
            Order::withTrashed()->forceDelete();
            Customer::query()->delete();
            Product::query()->delete();

            $products = $this->seedProducts($categories);
            $this->seedOrders($products);
        });
    }

    private function seedUsers(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'admin@company.local'],
            [
                'name' => 'Marketplace Admin',
                'password' => Hash::make('12345678'),
                'role' => 'admin',
                'phone' => '081200000001',
                'department' => 'Information Technology',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'seller@company.local'],
            [
                'name' => 'Marketplace Seller',
                'password' => Hash::make('12345678'),
                'role' => 'seller',
                'phone' => '081200000002',
                'department' => 'Procurement',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );
    }

    private function seedCategories()
    {
        return collect([
            'Elektronik Kantor',
            'Perlengkapan Kerja',
            'Alat Tulis Kantor',
            'Furniture Kantor',
            'Kebutuhan Pantry',
            'Seragam dan Atribut',
            'Layanan Teknologi',
            'Layanan Umum',
            'Kesehatan dan Keselamatan',
            'Promosi dan Dokumentasi',
        ])->map(function (string $name, int $index): Category {
            return Category::query()->updateOrCreate(
                ['slug' => Str::slug($name)],
                [
                    'name' => $name,
                    'description' => "Kategori {$name} untuk kebutuhan internal perusahaan.",
                    'image' => null,
                    'is_active' => true,
                    'sort_order' => $index + 1,
                ]
            );
        });
    }


    private function seedProducts($categories)
    {
        return collect(range(1, 50))->map(function (int $number) use ($categories): Product {
            $primaryCategory = $categories[($number - 1) % $categories->count()];
            $secondaryCategory = $categories[$number % $categories->count()];
            $isService = $number % 10 === 0;
            $name = $isService
                ? 'Layanan Internal '.str_pad((string) $number, 3, '0', STR_PAD_LEFT)
                : 'Produk Internal '.str_pad((string) $number, 3, '0', STR_PAD_LEFT);
            $thumbnail = 'https://placehold.co/800x800?text='.rawurlencode($name);

            $product = Product::query()->create([
                'primary_category_id' => $primaryCategory->id,
                'name' => $name,
                'slug' => Str::slug($name),
                'sku' => 'PRD-'.str_pad((string) $number, 4, '0', STR_PAD_LEFT),
                'type' => $isService ? 'service' : 'product',
                'description' => "{$name} tersedia untuk memenuhi kebutuhan operasional perusahaan.",
                'brand' => $isService ? 'Internal Service' : 'Corporate Supply',
                'thumbnail' => $thumbnail,
                'price' => 25000 + ($number * 7500),
                'track_stock' => ! $isService,
                'stock' => $isService ? null : 20 + $number,
                'status' => $number % 13 === 0 ? 'draft' : 'published',
                'is_featured' => $number <= 12,
                'is_active' => true,
            ]);

            $categoryPayload = [$primaryCategory->id => ['is_primary' => true]];
            if ($secondaryCategory->id !== $primaryCategory->id && $number % 3 === 0) {
                $categoryPayload[$secondaryCategory->id] = ['is_primary' => false];
            }

            $product->categories()->sync($categoryPayload);
            $product->images()->create([
                'url' => $thumbnail,
                'alt_text' => $name,
                'is_primary' => true,
                'sort_order' => 0,
            ]);

            return $product;
        });
    }

    private function seedOrders($products): void
    {
        $availableProducts = $products
            ->filter(fn (Product $product): bool => $product->status === 'published' && $product->is_active)
            ->values();
        $statuses = ['pending', 'confirmed', 'processing', 'completed', 'cancelled'];
        $customers = collect(range(1, 8))->map(function (int $number): Customer {
            $isBusiness = $number % 2 === 0;

            return Customer::query()->create([
                'email' => 'buyer'.str_pad((string) $number, 2, '0', STR_PAD_LEFT).'@company.local',
                'customer_type' => $isBusiness ? 'business' : 'individual',
                'name' => $isBusiness
                    ? 'Penanggung Jawab '.str_pad((string) $number, 2, '0', STR_PAD_LEFT)
                    : 'Karyawan '.str_pad((string) $number, 2, '0', STR_PAD_LEFT),
                'phone' => '0813'.str_pad((string) $number, 8, '0', STR_PAD_LEFT),
                'address' => 'Kantor Pusat, Lantai '.(($number % 8) + 1),
                'nik' => $isBusiness ? '3174'.str_pad((string) $number, 12, '0', STR_PAD_LEFT) : null,
                'npwp' => $isBusiness ? '01.234.567.'.($number % 10).'-'.str_pad((string) $number, 3, '0', STR_PAD_LEFT).'.000' : null,
                'province' => $isBusiness ? 'DKI Jakarta' : null,
                'city' => $isBusiness ? 'Jakarta Selatan' : null,
                'company_name' => $isBusiness ? 'PT Internal Mitra '.str_pad((string) $number, 2, '0', STR_PAD_LEFT) : null,
                'postal_code' => $isBusiness ? '12950' : null,
                'country' => $isBusiness ? 'Indonesia' : null,
            ]);
        });

        foreach (range(1, 20) as $number) {
            $product = $availableProducts[($number - 1) % $availableProducts->count()];
            $quantity = ($number % 3) + 1;
            $subtotal = round((float) $product->price * $quantity, 2);
            $status = $statuses[($number - 1) % count($statuses)];
            $orderDate = now()->subDays($number % 10);
            $customer = $customers[($number - 1) % $customers->count()];

            $order = Order::query()->create([
                'order_number' => 'INV-'.$orderDate->format('Ymd').'-'.str_pad((string) $number, 3, '0', STR_PAD_LEFT),
                'customer_id' => $customer->id,
                'customer_type' => $customer->customer_type,
                'guest_email' => $customer->email,
                'guest_name' => $customer->name,
                'guest_phone' => $customer->phone,
                'guest_address' => $customer->address,
                'guest_nik' => $customer->nik,
                'guest_npwp' => $customer->npwp,
                'guest_province' => $customer->province,
                'guest_city' => $customer->city,
                'guest_company_name' => $customer->company_name,
                'guest_postal_code' => $customer->postal_code,
                'guest_country' => $customer->country,
                'guest_notes' => $number % 2 === 0 ? 'Mohon diproses pada jam kerja.' : null,
                'subtotal' => $subtotal,
                'total_amount' => $subtotal,
                'status' => $status,
                'payment_method' => 'internal_billing',
                'payment_status' => $status === 'completed' ? 'paid' : 'unpaid',
                'cancelled_at' => $status === 'cancelled' ? $orderDate->copy()->addHour() : null,
                'cancel_reason' => $status === 'cancelled' ? 'Kebutuhan dibatalkan.' : null,
                'admin_notes' => null,
                'created_at' => $orderDate,
                'updated_at' => $orderDate,
            ]);

            $order->items()->create([
                'product_id' => $product->id,
                'product_name' => $product->name,
                'product_sku' => $product->sku,
                'product_type' => $product->type,
                'price' => $product->price,
                'quantity' => $quantity,
                'subtotal' => $subtotal,
            ]);
            $order->statusHistories()->create([
                'user_id' => null,
                'from_status' => null,
                'to_status' => 'pending',
                'notes' => 'Order contoh dibuat.',
                'created_at' => $orderDate,
                'updated_at' => $orderDate,
            ]);

            if ($status !== 'pending') {
                $order->statusHistories()->create([
                    'user_id' => null,
                    'from_status' => 'pending',
                    'to_status' => $status,
                    'notes' => 'Status order contoh diperbarui.',
                    'created_at' => $orderDate->copy()->addHour(),
                    'updated_at' => $orderDate->copy()->addHour(),
                ]);
            }
        }
    }
}
