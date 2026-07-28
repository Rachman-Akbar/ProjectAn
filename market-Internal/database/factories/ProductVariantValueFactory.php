<?php

namespace Database\Factories;

use App\Models\ProductAttribute;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductVariantValueFactory extends Factory
{
    public function definition(): array
    {
        return [
            'variant_id' => ProductVariant::factory(),
            'attribute_id' => ProductAttribute::factory(),
            'value' => fake()->word(),
        ];
    }
}
