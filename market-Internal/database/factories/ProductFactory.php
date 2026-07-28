<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ProductFactory extends Factory
{
    public function definition(): array
    {
        $name = Str::title(fake()->unique()->words(3, true));

        return [
            'primary_category_id' => Category::factory(),
            'name' => $name,
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(100, 99999),
            'type' => fake()->randomElement(['product', 'service']),
            'description' => fake()->paragraphs(2, true),
            'brand' => fake()->company(),
            'thumbnail' => null,
            'status' => 'published',
            'is_featured' => fake()->boolean(25),
            'is_active' => true,
            'rating' => fake()->randomFloat(1, 3, 5),
            'review_count' => fake()->numberBetween(0, 500),
        ];
    }
}
