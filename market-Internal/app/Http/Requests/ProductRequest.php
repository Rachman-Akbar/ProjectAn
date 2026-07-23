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
        foreach (['variants', 'existing_images'] as $key) {
            $value = $this->input($key);

            if (! is_string($value)) {
                continue;
            }

            $decoded = json_decode($value, true);

            if (json_last_error() === JSON_ERROR_NONE) {
                $this->merge([$key => $decoded]);
            }
        }

        if ($this->filled('slug')) {
            $this->merge(['slug' => Str::slug((string) $this->input('slug'))]);
        } elseif ($this->filled('name')) {
            $this->merge(['slug' => Str::slug((string) $this->input('name'))]);
        }

        foreach (['variant_mode', 'track_stock', 'is_featured', 'is_active'] as $key) {
            if ($this->has($key)) {
                $this->merge([$key => filter_var($this->input($key), FILTER_VALIDATE_BOOLEAN)]);
            }
        }
    }

    public function rules(): array
    {
        $product = $this->route('product');
        $productId = $product instanceof Product ? $product->id : null;

        return [
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:255', Rule::unique('products', 'name')->ignore($productId)],
            'slug' => ['required', 'string', 'max:255', Rule::unique('products', 'slug')->ignore($productId)],
            'type' => ['required', Rule::in(['product', 'service'])],
            'description' => ['nullable', 'string', 'max:20000'],
            'brand' => ['nullable', 'string', 'max:100'],
            'status' => ['required', Rule::in(['draft', 'published', 'archived'])],
            'is_featured' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
            'existing_images' => ['nullable', 'array', 'max:12'],
            'existing_images.*' => ['string', 'max:500'],
            'images' => ['nullable', 'array', 'max:12'],
            'images.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],

            'variant_mode' => ['required', 'boolean'],
            'simple_variant_id' => ['nullable', 'integer'],
            'sku' => ['nullable', 'string', 'max:100'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:9999999999999.99'],
            'track_stock' => ['nullable', 'boolean'],
            'stock' => ['nullable', 'integer', 'min:0'],

            'variants' => ['nullable', 'array', 'max:100'],
            'variants.*.id' => ['nullable', 'integer'],
            'variants.*.name' => ['required_with:variants', 'string', 'max:255'],
            'variants.*.sku' => ['nullable', 'string', 'max:100'],
            'variants.*.price' => ['required_with:variants', 'numeric', 'min:0', 'max:9999999999999.99'],
            'variants.*.attributes' => ['present_with:variants', 'array', 'min:1', 'max:20'],
            'variants.*.attributes.*.name' => ['required', 'string', 'max:100'],
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
            $variantMode = $this->boolean('variant_mode');
            $variants = collect($this->input('variants', []));
            $existingImages = collect($this->input('existing_images', []));
            $newImageCount = count($this->file('images', []));

            if ($existingImages->count() + $newImageCount > 12) {
                $validator->errors()->add('images', 'Total gambar tersimpan dan gambar baru maksimal 12.');
            }

            if (! $variantMode) {
                if (! is_numeric($this->input('price'))) {
                    $validator->errors()->add('price', 'Harga produk wajib diisi.');
                }

                if ($this->boolean('track_stock') && ! is_numeric($this->input('stock'))) {
                    $validator->errors()->add('stock', 'Stok wajib diisi saat pelacakan stok aktif.');
                }

                $simpleVariantId = $this->integer('simple_variant_id');
                if ($simpleVariantId && (! $productId || ! ProductVariant::query()
                    ->whereKey($simpleVariantId)
                    ->where('product_id', $productId)
                    ->exists())) {
                    $validator->errors()->add('simple_variant_id', 'Variant default tidak dimiliki produk ini.');
                }

                $simpleSku = trim((string) $this->input('sku', ''));
                if ($simpleSku !== '' && ProductVariant::query()
                    ->where('sku', $simpleSku)
                    ->when($productId, fn ($query) => $query->where('product_id', '!=', $productId))
                    ->exists()) {
                    $validator->errors()->add('sku', 'SKU sudah digunakan variant produk lain.');
                }

                return;
            }

            if ($variants->isEmpty()) {
                $validator->errors()->add('variants', 'Tambahkan minimal satu variant.');
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
                ->filter(fn ($sku) => filled($sku))
                ->map(fn ($sku) => mb_strtolower(trim((string) $sku)))
                ->duplicates();

            if ($skuDuplicates->isNotEmpty()) {
                $validator->errors()->add('variants', 'SKU setiap variant harus unik.');
            }

            $nameDuplicates = $variants
                ->pluck('name')
                ->map(fn ($name) => mb_strtolower(trim((string) $name)))
                ->duplicates();

            if ($nameDuplicates->isNotEmpty()) {
                $validator->errors()->add('variants', 'Nama variant pada satu produk harus unik.');
            }

            foreach ($variants as $index => $variant) {
                $variantId = filled($variant['id'] ?? null) ? (int) $variant['id'] : null;

                if ($variantId && (! $productId || ! ProductVariant::query()
                    ->whereKey($variantId)
                    ->where('product_id', $productId)
                    ->exists())) {
                    $validator->errors()->add("variants.{$index}.id", 'Variant tidak dimiliki produk ini.');
                }

                $sku = trim((string) ($variant['sku'] ?? ''));
                if ($sku !== '' && ProductVariant::query()
                    ->where('sku', $sku)
                    ->when($productId, fn ($query) => $query->where('product_id', '!=', $productId))
                    ->exists()) {
                    $validator->errors()->add("variants.{$index}.sku", 'SKU sudah digunakan variant produk lain.');
                }

                if (($variant['track_stock'] ?? false) && ! is_numeric($variant['stock'] ?? null)) {
                    $validator->errors()->add("variants.{$index}.stock", 'Stok wajib diisi saat pelacakan stok aktif.');
                }

                $attributeNames = collect($variant['attributes'] ?? [])
                    ->pluck('name')
                    ->map(fn ($name) => mb_strtolower(trim((string) $name)));

                if ($attributeNames->duplicates()->isNotEmpty()) {
                    $validator->errors()->add("variants.{$index}.attributes", 'Nama atribut dalam satu variant tidak boleh duplikat.');
                }
            }
        }];
    }
}
