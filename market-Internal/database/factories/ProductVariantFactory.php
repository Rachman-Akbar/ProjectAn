<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ProductVariantFactory extends Factory
{
    public function definition(): array
    {
        $name = Str::title(fake()->words(2, true));

        return [
            'product_id' => Product::factory(),
            'sku' => 'SKU-'.Str::upper(Str::random(10)),
            'name' => $name,
            'price' => fake()->randomFloat(2, 10000, 5000000),
            'track_stock' => true,
            'stock' => fake()->numberBetween(0, 200),
            'is_default' => false,
            'is_active' => true,
        ];
    }
}
