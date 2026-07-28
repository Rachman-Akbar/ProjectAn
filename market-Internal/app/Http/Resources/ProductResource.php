<?php

namespace App\Http\Resources;

use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $variants = $this->relationLoaded('variants')
            ? $this->variants->values()
            : collect();
        $activeVariants = $variants
            ->filter(fn (ProductVariant $variant): bool => (bool) $variant->is_active)
            ->values();
        $defaultVariant = $activeVariants->firstWhere('is_default', true)
            ?? $activeVariants->first();
        $prices = $activeVariants
            ->pluck('price')
            ->map(fn ($price): float => (float) $price);
        $images = $this->relationLoaded('images')
            ? $this->images->map(fn ($image): array => [
                'id' => $image->id,
                'path' => $this->normalizeImagePath($image->url),
                'url' => $this->imageUrl($image->url),
                'alt_text' => $image->alt_text,
                'is_primary' => (bool) $image->is_primary,
                'sort_order' => (int) $image->sort_order,
            ])->filter(fn (array $image): bool => filled($image['url']))->values()
            : collect();
        $firstImage = $images->first();

        return [
            'id' => $this->id,
            'category_id' => $this->primary_category_id,
            'primary_category_id' => $this->primary_category_id,
            'category' => $this->relationLoaded('primaryCategory') && $this->primaryCategory
                ? new CategoryResource($this->primaryCategory)
                : null,
            'categories' => $this->relationLoaded('categories')
                ? CategoryResource::collection($this->categories)
                : [],
            'name' => $this->name,
            'slug' => $this->slug,
            'type' => $this->type,
            'description' => $this->description,
            'brand' => $this->brand,
            'product_attributes' => $this->relationLoaded('attributeValues')
                ? $this->attributeValues->map(fn ($value): array => [
                    'id' => $value->id,
                    'attribute_id' => $value->attribute_id,
                    'name' => $value->relationLoaded('attribute') ? $value->attribute?->name : null,
                    'slug' => $value->relationLoaded('attribute') ? $value->attribute?->slug : null,
                    'type' => $value->relationLoaded('attribute') ? $value->attribute?->type : null,
                    'value' => $value->value,
                ])->values()->all()
                : [],
            'images' => $images->all(),
            'image_urls' => $images->pluck('url')->filter()->values()->all(),
            'thumbnail' => $firstImage['url'] ?? $this->imageUrl($this->thumbnail),
            'variants' => $variants
                ->map(fn (ProductVariant $variant): array => $this->variantPayload($variant))
                ->values()
                ->all(),
            'default_variant' => $defaultVariant
                ? $this->variantPayload($defaultVariant)
                : null,
            'default_variant_id' => $defaultVariant?->id,
            'has_multiple_variants' => $activeVariants->count() > 1,
            'requires_variant_selection' => $activeVariants->count() > 1,
            'price' => $defaultVariant ? (float) $defaultVariant->price : 0,
            'price_min' => $prices->min() ?? 0,
            'price_max' => $prices->max() ?? 0,
            'available' => $activeVariants->contains(
                fn (ProductVariant $variant): bool => $this->variantAvailable($variant)
            ),
            'rating' => (float) ($this->rating ?? 0),
            'review_count' => (int) ($this->review_count ?? 0),
            'status' => $this->status,
            'is_featured' => (bool) $this->is_featured,
            'is_active' => (bool) $this->is_active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function variantPayload(ProductVariant $variant): array
    {
        $attributes = $variant->relationLoaded('values')
            ? $variant->values->map(fn ($value): array => [
                'id' => $value->id,
                'attribute_id' => $value->attribute_id,
                'name' => $value->relationLoaded('attribute') ? $value->attribute?->name : null,
                'slug' => $value->relationLoaded('attribute') ? $value->attribute?->slug : null,
                'value' => $value->value,
            ])->values()->all()
            : [];

        return [
            'id' => $variant->id,
            'product_id' => $variant->product_id,
            'sku' => $variant->sku,
            'name' => $variant->name,
            'price' => (float) $variant->price,
            'attributes' => $attributes,
            'values' => $attributes,
            'track_stock' => (bool) $variant->track_stock,
            'stock' => $variant->stock !== null ? (int) $variant->stock : null,
            'is_default' => (bool) $variant->is_default,
            'is_active' => (bool) $variant->is_active,
            'available' => $this->variantAvailable($variant),
        ];
    }

    private function variantAvailable(ProductVariant $variant): bool
    {
        if (! $variant->is_active) {
            return false;
        }

        if (! $variant->track_stock) {
            return true;
        }

        return (int) ($variant->stock ?? 0) > 0;
    }

    private function normalizeImagePath(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        $path = trim(str_replace('\\', '/', $path));

        if ($path === '') {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        $path = ltrim($path, '/');

        foreach (['storage/app/public/', 'public/storage/', 'storage/'] as $prefix) {
            if (str_starts_with($path, $prefix)) {
                $path = substr($path, strlen($prefix));
                break;
            }
        }

        return filled($path) ? $path : null;
    }

    private function imageUrl(?string $path): ?string
    {
        $path = $this->normalizeImagePath($path);

        if (! $path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        $filename = basename($path);

        return $filename === ''
            ? null
            : route('media.products', ['filename' => $filename]);
    }
}
