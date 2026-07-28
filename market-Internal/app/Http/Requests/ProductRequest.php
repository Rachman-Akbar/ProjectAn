<?php

namespace App\Http\Requests;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'seller'], true);
    }

    protected function prepareForValidation(): void
    {
        $primaryCategoryId = $this->input('primary_category_id', $this->input('category_id'));
        $categoryIds = $this->decodeArray($this->input('category_ids', $this->input('categories', [])));

        if (! is_array($categoryIds)) {
            $categoryIds = [];
        }

        $categoryIds = collect($categoryIds)
            ->map(fn ($category): mixed => is_array($category) ? ($category['id'] ?? null) : $category)
            ->filter(fn ($category): bool => is_numeric($category))
            ->map(fn ($category): int => (int) $category)
            ->when(filled($primaryCategoryId), fn ($categories) => $categories->prepend((int) $primaryCategoryId))
            ->unique()
            ->values()
            ->all();

        $variants = $this->decodeArray($this->input('variants', []));
        $variants = is_array($variants) ? $variants : [];
        $hasExplicitDefault = collect($variants)->contains(fn ($variant): bool =>
            is_array($variant) && array_key_exists('is_default', $variant)
        );

        $variants = collect($variants)
            ->filter(fn ($variant): bool => is_array($variant))
            ->values()
            ->map(function (array $variant, int $index) use ($hasExplicitDefault): array {
                $attributes = $this->decodeArray($variant['attributes'] ?? $variant['values'] ?? []);

                return [
                    'id' => filled($variant['id'] ?? null) ? (int) $variant['id'] : null,
                    'name' => trim((string) ($variant['name'] ?? '')),
                    'sku' => filled($variant['sku'] ?? null) ? trim((string) $variant['sku']) : null,
                    'price' => filled($variant['price'] ?? null) ? $variant['price'] : null,
                    'track_stock' => $this->toBoolean($variant['track_stock'] ?? true),
                    'stock' => filled($variant['stock'] ?? null) ? $variant['stock'] : null,
                    'is_default' => $hasExplicitDefault
                        ? $this->toBoolean($variant['is_default'] ?? false)
                        : $index === 0,
                    'is_active' => $this->toBoolean($variant['is_active'] ?? true),
                    'attributes' => $this->normalizeAttributes($attributes),
                ];
            })
            ->all();

        $productAttributes = $this->decodeArray(
            $this->input('product_attributes', $this->input('attributes', []))
        );
        $existingImages = $this->decodeArray($this->input('existing_images', []));

        if (is_array($existingImages)) {
            $existingImages = collect($existingImages)
                ->map(fn ($image): mixed => is_array($image) ? ($image['path'] ?? $image['url'] ?? null) : $image)
                ->filter(fn ($image): bool => is_string($image) && trim($image) !== '')
                ->values()
                ->all();
        }

        $merge = [
            'primary_category_id' => filled($primaryCategoryId) ? (int) $primaryCategoryId : null,
            'category_id' => filled($primaryCategoryId) ? (int) $primaryCategoryId : null,
            'category_ids' => $categoryIds,
            'variants' => $variants,
            'product_attributes' => $this->normalizeAttributes($productAttributes),
            'variant_mode' => count($variants) > 0,
        ];

        if ($this->has('existing_images')) {
            $merge['existing_images'] = is_array($existingImages) ? $existingImages : [];
        }

        if ($this->filled('slug')) {
            $merge['slug'] = Str::slug((string) $this->input('slug'));
        } elseif ($this->filled('name')) {
            $merge['slug'] = Str::slug((string) $this->input('name'));
        }

        foreach (['track_stock', 'is_featured', 'is_active'] as $key) {
            if ($this->has($key)) {
                $merge[$key] = $this->toBoolean($this->input($key));
            }
        }

        $this->merge($merge);
    }

    public function rules(): array
    {
        $product = $this->route('product');
        $productId = $product instanceof Product ? $product->id : null;

        return [
            'primary_category_id' => ['required', 'integer', 'exists:categories,id'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'category_ids' => ['required', 'array', 'min:1', 'max:20'],
            'category_ids.*' => ['required', 'integer', 'distinct', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:255', Rule::unique('products', 'name')->ignore($productId)],
            'slug' => ['required', 'string', 'max:255', Rule::unique('products', 'slug')->ignore($productId)],
            'type' => ['required', Rule::in(['product', 'service'])],
            'description' => ['nullable', 'string', 'max:20000'],
            'brand' => ['nullable', 'string', 'max:100'],
            'status' => ['required', Rule::in(['draft', 'published', 'archived'])],
            'is_featured' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
            'existing_images' => ['nullable', 'array', 'max:12'],
            'existing_images.*' => ['string', 'max:1000'],
            'images' => ['nullable', 'array', 'max:12'],
            'images.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'product_attributes' => ['nullable', 'array', 'max:30'],
            'product_attributes.*.attribute_id' => ['nullable', 'integer', 'exists:product_attributes,id'],
            'product_attributes.*.name' => ['nullable', 'string', 'max:100'],
            'product_attributes.*.value' => ['required_with:product_attributes', 'string', 'max:1000'],
            'simple_variant_id' => ['nullable', 'integer'],
            'sku' => ['nullable', 'string', 'max:100'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:9999999999999.99'],
            'track_stock' => ['nullable', 'boolean'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'variants' => ['nullable', 'array', 'max:100'],
            'variants.*.id' => ['nullable', 'integer'],
            'variants.*.name' => ['required_with:variants', 'string', 'max:255'],
            'variants.*.sku' => ['nullable', 'string', 'max:100'],
            'variants.*.price' => ['nullable', 'numeric', 'min:0', 'max:9999999999999.99'],
            'variants.*.attributes' => ['required_with:variants', 'array', 'min:1', 'max:20'],
            'variants.*.attributes.*.attribute_id' => ['nullable', 'integer', 'exists:product_attributes,id'],
            'variants.*.attributes.*.name' => ['nullable', 'string', 'max:100'],
            'variants.*.attributes.*.value' => ['required', 'string', 'max:255'],
            'variants.*.track_stock' => ['required_with:variants', 'boolean'],
            'variants.*.stock' => ['nullable', 'integer', 'min:0'],
            'variants.*.is_default' => ['required_with:variants', 'boolean'],
            'variants.*.is_active' => ['required_with:variants', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            $product = $this->route('product');
            $productId = $product instanceof Product ? $product->id : null;
            $variants = collect($this->input('variants', []));
            $existingImages = $this->has('existing_images')
                ? collect($this->input('existing_images', []))
                : collect($product instanceof Product ? $product->images()->pluck('url')->all() : []);
            $newImageCount = count($this->file('images', []));

            if ($existingImages->count() + $newImageCount > 12) {
                $validator->errors()->add('images', 'Total gambar tersimpan dan gambar baru maksimal 12.');
            }

            if (! collect($this->input('category_ids', []))->contains((int) $this->input('primary_category_id'))) {
                $validator->errors()->add('category_ids', 'Kategori utama harus termasuk dalam daftar kategori produk.');
            }

            $duplicateName = Product::query()
                ->where('name', trim((string) $this->input('name')))
                ->when($productId, fn ($query) => $query->whereKeyNot($productId))
                ->exists();

            if ($duplicateName) {
                $validator->errors()->add('name', 'Nama produk sudah digunakan pada katalog perusahaan.');
            }

            $this->validateAttributeRows($validator, collect($this->input('product_attributes', [])), 'product_attributes');

            if ($variants->isEmpty()) {
                if (! is_numeric($this->input('price'))) {
                    $validator->errors()->add('price', 'Harga wajib diisi agar variant default dapat dibuat otomatis.');
                }

                if ($this->boolean('track_stock', true) && ! is_numeric($this->input('stock'))) {
                    $validator->errors()->add('stock', 'Stok wajib diisi saat pelacakan stok aktif.');
                }

                $simpleVariantId = $this->integer('simple_variant_id')
                    ?: ($product instanceof Product
                        ? $product->variants()->orderByDesc('is_default')->value('id')
                        : null);

                if ($simpleVariantId && (! $productId || ! ProductVariant::query()
                    ->whereKey($simpleVariantId)
                    ->where('product_id', $productId)
                    ->exists())) {
                    $validator->errors()->add('simple_variant_id', 'Variant default tidak dimiliki produk ini.');
                }

                $this->validateSku($validator, trim((string) $this->input('sku', '')), $simpleVariantId, 'sku');

                return;
            }

            if ($variants->where('is_default', true)->count() !== 1) {
                $validator->errors()->add('variants', 'Harus ada tepat satu variant default.');
            }

            if ($variants->where('is_active', true)->isEmpty()) {
                $validator->errors()->add('variants', 'Minimal harus ada satu variant aktif.');
            }

            $skuDuplicates = $variants
                ->pluck('sku')
                ->filter(fn ($sku): bool => filled($sku))
                ->map(fn ($sku): string => mb_strtolower(trim((string) $sku)))
                ->duplicates();

            if ($skuDuplicates->isNotEmpty()) {
                $validator->errors()->add('variants', 'SKU setiap variant harus unik.');
            }

            $nameDuplicates = $variants
                ->pluck('name')
                ->map(fn ($name): string => mb_strtolower(trim((string) $name)))
                ->duplicates();

            if ($nameDuplicates->isNotEmpty()) {
                $validator->errors()->add('variants', 'Nama variant pada satu produk harus unik.');
            }

            $combinationKeys = collect();

            foreach ($variants as $index => $variant) {
                $variantId = filled($variant['id'] ?? null) ? (int) $variant['id'] : null;

                if ($variantId && (! $productId || ! ProductVariant::query()
                    ->whereKey($variantId)
                    ->where('product_id', $productId)
                    ->exists())) {
                    $validator->errors()->add("variants.{$index}.id", 'Variant tidak dimiliki produk ini.');
                }

                $this->validateSku(
                    $validator,
                    trim((string) ($variant['sku'] ?? '')),
                    $variantId,
                    "variants.{$index}.sku"
                );

                if (! is_numeric($variant['price'] ?? null) && ! is_numeric($this->input('price'))) {
                    $validator->errors()->add("variants.{$index}.price", 'Harga variant atau harga default produk wajib diisi.');
                }

                if (($variant['track_stock'] ?? false) && ! is_numeric($variant['stock'] ?? null)) {
                    $validator->errors()->add("variants.{$index}.stock", 'Stok wajib diisi saat pelacakan stok aktif.');
                }

                $attributes = collect($variant['attributes'] ?? []);

                if ($attributes->isEmpty()) {
                    $validator->errors()->add("variants.{$index}.attributes", 'Variant yang dibuat manual wajib memiliki minimal satu atribut.');
                    continue;
                }

                $this->validateAttributeRows($validator, $attributes, "variants.{$index}.attributes");

                $combinationKey = $attributes
                    ->map(fn (array $attribute): string => mb_strtolower(trim((string) ($attribute['attribute_id'] ?? $attribute['name'] ?? '')).'='.trim((string) ($attribute['value'] ?? ''))))
                    ->sort()
                    ->implode('|');

                if ($combinationKeys->contains($combinationKey)) {
                    $validator->errors()->add("variants.{$index}.attributes", 'Kombinasi atribut variant tidak boleh duplikat.');
                }

                $combinationKeys->push($combinationKey);
            }
        }];
    }

    private function validateAttributeRows(Validator $validator, $attributes, string $key): void
    {
        $names = collect();

        foreach ($attributes as $index => $attribute) {
            $attributeId = $attribute['attribute_id'] ?? null;
            $name = trim((string) ($attribute['name'] ?? ''));

            if (! filled($attributeId) && $name === '') {
                $validator->errors()->add("{$key}.{$index}.name", 'Pilih atribut atau isi nama atribut.');
                continue;
            }

            $identity = filled($attributeId) ? 'id:'.(int) $attributeId : 'name:'.mb_strtolower($name);

            if ($names->contains($identity)) {
                $validator->errors()->add($key, 'Atribut yang sama tidak boleh digunakan lebih dari satu kali.');
            }

            $names->push($identity);
        }
    }

    private function validateSku(Validator $validator, string $sku, ?int $ignoreId, string $key): void
    {
        if ($sku === '') {
            return;
        }

        $exists = ProductVariant::query()
            ->where('sku', $sku)
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists();

        if ($exists) {
            $validator->errors()->add($key, 'SKU sudah digunakan pada katalog perusahaan.');
        }
    }

    private function normalizeAttributes(mixed $attributes): array
    {
        return collect(is_array($attributes) ? $attributes : [])
            ->filter(fn ($attribute): bool => is_array($attribute))
            ->map(fn (array $attribute): array => [
                'attribute_id' => filled($attribute['attribute_id'] ?? $attribute['id'] ?? null)
                    ? (int) ($attribute['attribute_id'] ?? $attribute['id'])
                    : null,
                'name' => filled($attribute['name'] ?? $attribute['key'] ?? null)
                    ? trim((string) ($attribute['name'] ?? $attribute['key']))
                    : null,
                'value' => filled($attribute['value'] ?? null)
                    ? trim((string) $attribute['value'])
                    : null,
            ])
            ->filter(fn (array $attribute): bool => filled($attribute['attribute_id']) || filled($attribute['name']) || filled($attribute['value']))
            ->values()
            ->all();
    }

    private function decodeArray(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        $decoded = json_decode($value, true);

        return json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
    }

    private function toBoolean(mixed $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false;
    }
}
