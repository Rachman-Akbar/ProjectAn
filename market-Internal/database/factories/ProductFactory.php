<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);

        return [
            'category_id' => Category::factory(),
            'name' => Str::title($name),
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(100, 99999),
            'type' => 'product',
            'description' => fake()->paragraph(),
            'brand' => fake()->company(),
            'images' => [],
            'rating' => 0,
            'review_count' => 0,
            'status' => 'published',
            'is_featured' => false,
            'is_active' => true,
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (Product $product): void {
            ProductVariant::query()->create([
                'product_id' => $product->id,
                'sku' => 'SKU-'.$product->id.'-'.Str::upper(Str::random(6)),
                'name' => 'Default',
                'price' => 125000,
                'attributes' => [],
                'track_stock' => true,
                'stock' => 5,
                'is_default' => true,
                'is_active' => true,
            ]);
        });
    }
}
