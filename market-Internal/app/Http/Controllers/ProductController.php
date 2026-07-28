<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\ProductMediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class ProductController extends Controller
{
    public function __construct(private ProductMediaService $media)
    {
    }

    public function publicIndex(Request $request): AnonymousResourceCollection
    {
        $perPage = min(48, max(1, $request->integer('per_page', 16)));

        $query = Product::query()
            ->where('status', 'published')
            ->where('is_active', true)
            ->whereHas('primaryCategory', fn ($query) => $query->where('is_active', true))
            ->with($this->relations(true))
            ->when($request->filled('category'), function ($query) use ($request): void {
                $category = trim((string) $request->input('category'));

                $query->whereHas('categories', function ($query) use ($category): void {
                    $query->where('categories.slug', $category);

                    if (ctype_digit($category)) {
                        $query->orWhere('categories.id', (int) $category);
                    }
                });
            })
            ->when($request->filled('type'), fn ($query) => $query->where('type', $request->input('type')))
            ->when($request->boolean('featured'), fn ($query) => $query->where('is_featured', true))
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = trim((string) $request->input('search'));

                $query->where(function ($query) use ($search): void {
                    $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('brand', 'like', "%{$search}%")
                        ->orWhereHas('categories', fn ($query) => $query->where('categories.name', 'like', "%{$search}%"))
                        ->orWhereHas('variants', function ($query) use ($search): void {
                            $query
                                ->where('sku', 'like', "%{$search}%")
                                ->orWhere('name', 'like', "%{$search}%")
                                ->orWhereHas('values', fn ($query) => $query->where('value', 'like', "%{$search}%"));
                        });
                });
            });

        match ($request->input('sort')) {
            'name' => $query->orderBy('name'),
            'price_asc' => $query->orderBy($this->priceSubquery('asc')),
            'price_desc' => $query->orderByDesc($this->priceSubquery('desc')),
            default => $query->latest('id'),
        };

        return ProductResource::collection($query->paginate($perPage)->withQueryString());
    }

    public function publicShow(string $identifier): ProductResource
    {
        $product = Product::query()
            ->where('status', 'published')
            ->where('is_active', true)
            ->whereHas('primaryCategory', fn ($query) => $query->where('is_active', true))
            ->where(function ($query) use ($identifier): void {
                $query->where('slug', $identifier);

                if (ctype_digit($identifier)) {
                    $query->orWhereKey((int) $identifier);
                }
            })
            ->with($this->relations(true))
            ->firstOrFail();

        return new ProductResource($product);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $products = Product::query()
            ->with($this->relations())
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = trim((string) $request->input('search'));

                $query->where(function ($query) use ($search): void {
                    $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('brand', 'like', "%{$search}%")
                        ->orWhereHas('categories', fn ($query) => $query->where('categories.name', 'like', "%{$search}%"))
                        ->orWhereHas('variants', function ($query) use ($search): void {
                            $query
                                ->where('sku', 'like', "%{$search}%")
                                ->orWhere('name', 'like', "%{$search}%");
                        });
                });
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->input('status')))
            ->when(
                $request->filled('category_id'),
                fn ($query) => $query->whereHas('categories', fn ($query) => $query->where('categories.id', $request->integer('category_id')))
            )
            ->latest('id')
            ->paginate(min(100, max(1, $request->integer('per_page', 20))))
            ->withQueryString();

        return ProductResource::collection($products);
    }

    public function attributeOptions(): JsonResponse
    {
        $options = ProductAttribute::query()
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'type']);

        return response()->json(['data' => $options]);
    }

    public function store(ProductRequest $request): JsonResponse
    {
        $media = $this->media->prepare([], [], $request->file('images', []));

        try {
            $product = DB::transaction(function () use ($request, $media): Product {
                $product = Product::query()->create($this->productData($request, $media['paths']));
                $this->syncCategories($product, $request->validated('category_ids', []));
                $this->syncProductAttributes($product, $request->validated('product_attributes', []));
                $this->syncVariants($product, $this->variantPayloads($request, $product));
                $this->syncImages($product, $media['paths']);

                return $product;
            }, 3);
        } catch (Throwable $exception) {
            $this->media->deleteMany($media['new_paths']);
            throw $exception;
        }

        return (new ProductResource($this->load($product)))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Product $product): ProductResource
    {
        $this->ensureProductAccess($request->user());

        return new ProductResource($this->load($product));
    }

    public function update(ProductRequest $request, Product $product): ProductResource
    {
        $this->ensureProductAccess($request->user());
        $existingPaths = $product->images()->pluck('url')->all();
        $keptImages = $request->has('existing_images')
            ? $request->input('existing_images', [])
            : $existingPaths;
        $media = $this->media->prepare($existingPaths, $keptImages, $request->file('images', []));

        try {
            DB::transaction(function () use ($request, $product, $media): void {
                $product->update($this->productData($request, $media['paths'], $product));
                $this->syncCategories($product, $request->validated('category_ids', []));
                $this->syncProductAttributes($product, $request->validated('product_attributes', []));
                $this->syncVariants($product, $this->variantPayloads($request, $product));
                $this->syncImages($product, $media['paths']);
            }, 3);
        } catch (Throwable $exception) {
            $this->media->deleteMany($media['new_paths']);
            throw $exception;
        }

        $this->media->deleteMany($media['removed_paths']);

        return new ProductResource($this->load($product->fresh()));
    }

    public function destroy(Request $request, Product $product): Response
    {
        $this->ensureProductAccess($request->user());
        $paths = $product->images()->pluck('url')->all();

        DB::transaction(fn () => $product->delete(), 3);
        $this->media->deleteMany($paths);

        return response()->noContent();
    }

    private function productData(ProductRequest $request, array $images, ?Product $product = null): array
    {
        $validated = $request->validated();

        return [
            'primary_category_id' => (int) $validated['primary_category_id'],
            'name' => trim((string) $validated['name']),
            'slug' => $this->uniqueSlug($validated['slug'] ?? null, $validated['name'], $product?->id),
            'type' => $validated['type'],
            'description' => filled($validated['description'] ?? null) ? trim((string) $validated['description']) : null,
            'brand' => filled($validated['brand'] ?? null) ? trim((string) $validated['brand']) : null,
            'thumbnail' => $images[0] ?? null,
            'status' => $validated['status'],
            'is_featured' => (bool) $validated['is_featured'],
            'is_active' => (bool) $validated['is_active'],
        ];
    }

    private function variantPayloads(ProductRequest $request, Product $product): array
    {
        $variants = collect($request->validated('variants', []));

        if ($variants->isEmpty()) {
            $simpleVariantId = $request->integer('simple_variant_id')
                ?: $product->variants()->orderByDesc('is_default')->value('id');
            $trackStock = $request->boolean('track_stock', true);

            return [[
                'id' => $simpleVariantId,
                'name' => 'Default',
                'sku' => $this->uniqueSku($request->input('sku'), $product->name, 'Default', $simpleVariantId),
                'price' => (float) $request->input('price'),
                'track_stock' => $trackStock,
                'stock' => $trackStock ? (int) $request->input('stock', 0) : null,
                'is_default' => true,
                'is_active' => true,
                'attributes' => [],
            ]];
        }

        $defaultPrice = is_numeric($request->input('price')) ? (float) $request->input('price') : 0.0;

        return $variants
            ->values()
            ->map(function (array $variant) use ($product, $defaultPrice): array {
                $id = filled($variant['id'] ?? null) ? (int) $variant['id'] : null;
                $name = trim((string) $variant['name']);
                $trackStock = (bool) $variant['track_stock'];

                return [
                    'id' => $id,
                    'name' => $name,
                    'sku' => $this->uniqueSku($variant['sku'] ?? null, $product->name, $name, $id),
                    'price' => is_numeric($variant['price'] ?? null) ? (float) $variant['price'] : $defaultPrice,
                    'track_stock' => $trackStock,
                    'stock' => $trackStock ? (int) ($variant['stock'] ?? 0) : null,
                    'is_default' => (bool) $variant['is_default'],
                    'is_active' => (bool) $variant['is_active'],
                    'attributes' => $variant['attributes'] ?? [],
                ];
            })
            ->all();
    }

    private function syncCategories(Product $product, array $categoryIds): void
    {
        $payload = collect($categoryIds)
            ->unique()
            ->mapWithKeys(fn ($categoryId): array => [
                (int) $categoryId => ['is_primary' => (int) $categoryId === (int) $product->primary_category_id],
            ])
            ->all();

        $product->categories()->sync($payload);
    }

    private function syncProductAttributes(Product $product, array $attributes): void
    {
        $product->attributeValues()->delete();

        foreach ($attributes as $attribute) {
            $product->attributeValues()->create([
                'attribute_id' => $this->resolveAttributeId($attribute),
                'value' => trim((string) $attribute['value']),
            ]);
        }
    }

    private function syncVariants(Product $product, array $payloads): void
    {
        $existingIds = collect($payloads)
            ->pluck('id')
            ->filter()
            ->map(fn ($id): int => (int) $id)
            ->values();

        if ($existingIds->isEmpty()) {
            $product->variants()->delete();
        } else {
            $product->variants()->whereNotIn('id', $existingIds)->delete();
            $product->variants()
                ->whereIn('id', $existingIds)
                ->get()
                ->each(fn (ProductVariant $variant) => $variant->update([
                    'sku' => '__tmp_sku_'.$variant->id.'_'.Str::random(12),
                    'name' => '__tmp_name_'.$variant->id.'_'.Str::random(12),
                ]));
        }

        foreach ($payloads as $payload) {
            $variant = filled($payload['id'] ?? null)
                ? $product->variants()->whereKey((int) $payload['id'])->firstOrFail()
                : new ProductVariant();
            $attributes = $payload['attributes'] ?? [];
            $variantData = collect($payload)->except(['id', 'attributes'])->all();

            $variant->fill($variantData);
            $variant->product_id = $product->id;
            $variant->save();
            $variant->values()->delete();

            foreach ($attributes as $attribute) {
                $variant->values()->create([
                    'attribute_id' => $this->resolveAttributeId($attribute),
                    'value' => trim((string) $attribute['value']),
                ]);
            }
        }
    }

    private function syncImages(Product $product, array $paths): void
    {
        $product->images()->delete();

        foreach (array_values($paths) as $index => $path) {
            $product->images()->create([
                'url' => $path,
                'alt_text' => $product->name,
                'is_primary' => $index === 0,
                'sort_order' => $index,
            ]);
        }

        $product->forceFill(['thumbnail' => $paths[0] ?? null])->save();
    }

    private function resolveAttributeId(array $attribute): int
    {
        if (filled($attribute['attribute_id'] ?? null)) {
            return (int) $attribute['attribute_id'];
        }

        $name = trim((string) ($attribute['name'] ?? 'Atribut'));
        $slug = Str::slug($name) ?: 'atribut-'.Str::lower(Str::random(8));

        return ProductAttribute::query()->firstOrCreate(
            ['slug' => $slug],
            ['name' => $name, 'type' => 'select']
        )->id;
    }

    private function uniqueSlug(?string $requested, string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug(filled($requested) ? $requested : $name) ?: 'produk';
        $slug = $base;
        $counter = 2;

        while (Product::query()
            ->where('slug', $slug)
            ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists()) {
            $slug = $base.'-'.$counter;
            $counter++;
        }

        return $slug;
    }

    private function uniqueSku(?string $requested, string $productName, string $variantName, ?int $ignoreId = null): string
    {
        if (filled($requested)) {
            return trim((string) $requested);
        }

        $base = Str::upper(Str::slug($productName.'-'.$variantName, '-')) ?: 'SKU';
        $sku = Str::limit($base, 90, '');
        $counter = 2;

        while (ProductVariant::query()
            ->where('sku', $sku)
            ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists()) {
            $suffix = '-'.$counter;
            $sku = Str::limit($base, 100 - strlen($suffix), '').$suffix;
            $counter++;
        }

        return $sku;
    }

    private function load(Product $product): Product
    {
        return $product->load($this->relations());
    }

    private function relations(bool $public = false): array
    {
        return [
            'primaryCategory',
            'categories',
            'attributeValues.attribute',
            'images',
            'variants' => fn ($query) => $query
                ->when($public, fn ($query) => $query->where('is_active', true))
                ->with('values.attribute')
                ->orderByDesc('is_default')
                ->orderBy('id'),
        ];
    }

    private function priceSubquery(string $direction)
    {
        $query = ProductVariant::query()
            ->select('price')
            ->whereColumn('product_variants.product_id', 'products.id')
            ->where('is_active', true);

        return $direction === 'desc'
            ? $query->orderByDesc('price')->limit(1)
            : $query->orderBy('price')->limit(1);
    }

    private function ensureProductAccess(?User $user): void
    {
        abort_unless($user && in_array($user->role, ['admin', 'seller'], true), 403);
    }
}
