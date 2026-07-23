<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\ProductMediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
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
            ->with([
                'category',
                'variants' => fn ($query) => $query
                    ->where('is_active', true)
                    ->orderByDesc('is_default')
                    ->orderBy('id'),
            ])
            ->when($request->filled('category'), function ($query) use ($request): void {
                $category = trim((string) $request->input('category'));

                $query->whereHas('category', function ($query) use ($category): void {
                    $query->where('slug', $category);

                    if (ctype_digit($category)) {
                        $query->orWhereKey((int) $category);
                    }
                });
            })
            ->when(
                $request->filled('type'),
                fn ($query) => $query->where('type', $request->input('type'))
            )
            ->when(
                $request->boolean('featured'),
                fn ($query) => $query->where('is_featured', true)
            )
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = trim((string) $request->input('search'));

                $query->where(function ($query) use ($search): void {
                    $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('brand', 'like', "%{$search}%")
                        ->orWhereHas('category', fn ($query) => $query->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('variants', function ($query) use ($search): void {
                            $query
                                ->where('sku', 'like', "%{$search}%")
                                ->orWhere('name', 'like', "%{$search}%");
                        });
                });
            });

        match ($request->input('sort')) {
            'name' => $query->orderBy('name'),
            'price_asc' => $query->orderBy($this->priceSubquery('asc')),
            'price_desc' => $query->orderByDesc($this->priceSubquery('desc')),
            default => $query->latest('id'),
        };

        return ProductResource::collection(
            $query->paginate($perPage)->withQueryString()
        );
    }

    public function publicShow(string $identifier): ProductResource
    {
        $product = Product::query()
            ->where('status', 'published')
            ->where('is_active', true)
            ->where(function ($query) use ($identifier): void {
                $query->where('slug', $identifier);

                if (ctype_digit($identifier)) {
                    $query->orWhereKey((int) $identifier);
                }
            })
            ->with([
                'category',
                'variants' => fn ($query) => $query
                    ->where('is_active', true)
                    ->orderByDesc('is_default')
                    ->orderBy('id'),
            ])
            ->firstOrFail();

        return new ProductResource($product);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $products = Product::query()
            ->with([
                'category',
                'variants' => fn ($query) => $query
                    ->orderByDesc('is_default')
                    ->orderBy('id'),
            ])
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = trim((string) $request->input('search'));

                $query->where(function ($query) use ($search): void {
                    $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('brand', 'like', "%{$search}%")
                        ->orWhereHas('category', fn ($query) => $query->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('variants', function ($query) use ($search): void {
                            $query
                                ->where('sku', 'like', "%{$search}%")
                                ->orWhere('name', 'like', "%{$search}%");
                        });
                });
            })
            ->when(
                $request->filled('status'),
                fn ($query) => $query->where('status', $request->input('status'))
            )
            ->when(
                $request->filled('category_id'),
                fn ($query) => $query->where('category_id', $request->integer('category_id'))
            )
            ->latest('id')
            ->paginate(min(100, max(1, $request->integer('per_page', 20))))
            ->withQueryString();

        return ProductResource::collection($products);
    }

    public function attributeOptions(): JsonResponse
    {
        $options = ProductVariant::query()
            ->whereNotNull('attributes')
            ->pluck('attributes')
            ->flatMap(fn ($attributes) => is_array($attributes) ? $attributes : [])
            ->filter(fn ($attribute) => is_array($attribute) && filled($attribute['name'] ?? null))
            ->pluck('name')
            ->map(fn ($name) => trim((string) $name))
            ->unique(fn ($name) => mb_strtolower($name))
            ->sort()
            ->values();

        return response()->json(['data' => $options]);
    }

    public function store(ProductRequest $request): JsonResponse
    {
        $media = $this->media->prepare([], [], $request->file('images', []));

        try {
            $product = DB::transaction(function () use ($request, $media): Product {
                $product = Product::query()->create($this->productData($request, $media['paths']));
                $this->syncVariants($product, $this->variantPayloads($request, $product));

                return $product;
            });
        } catch (Throwable $exception) {
            $this->media->deleteMany($media['new_paths']);
            throw $exception;
        }

        return (new ProductResource($this->load($product)))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Product $product): ProductResource
    {
        return new ProductResource($this->load($product));
    }

    public function update(ProductRequest $request, Product $product): ProductResource
    {
        $media = $this->media->prepare(
            $product->images ?? [],
            $request->input('existing_images', []),
            $request->file('images', [])
        );

        try {
            DB::transaction(function () use ($request, $product, $media): void {
                $product->update($this->productData($request, $media['paths'], $product));
                $this->syncVariants($product, $this->variantPayloads($request, $product));
            });
        } catch (Throwable $exception) {
            $this->media->deleteMany($media['new_paths']);
            throw $exception;
        }

        $this->media->deleteMany($media['removed_paths']);

        return new ProductResource($this->load($product->fresh()));
    }

    public function destroy(Product $product)
    {
        $images = $product->images ?? [];

        DB::transaction(function () use ($product): void {
            $product->delete();
        });

        $this->media->deleteMany($images);

        return response()->noContent();
    }

    private function productData(ProductRequest $request, array $images, ?Product $product = null): array
    {
        $validated = $request->validated();

        return [
            'category_id' => (int) $validated['category_id'],
            'name' => trim((string) $validated['name']),
            'slug' => $this->uniqueSlug($validated['slug'] ?? null, $validated['name'], $product?->id),
            'type' => $validated['type'],
            'description' => filled($validated['description'] ?? null)
                ? trim((string) $validated['description'])
                : null,
            'brand' => filled($validated['brand'] ?? null)
                ? trim((string) $validated['brand'])
                : null,
            'images' => array_values($images),
            'status' => $validated['status'],
            'is_featured' => (bool) $validated['is_featured'],
            'is_active' => (bool) $validated['is_active'],
        ];
    }

    private function variantPayloads(ProductRequest $request, Product $product): array
    {
        if (! $request->boolean('variant_mode')) {
            $simpleVariantId = $request->integer('simple_variant_id') ?: null;
            $trackStock = $request->boolean('track_stock', true);

            return [[
                'id' => $simpleVariantId,
                'name' => 'Default',
                'sku' => $this->uniqueSku(
                    $request->input('sku'),
                    $product->name,
                    'Default',
                    $simpleVariantId
                ),
                'price' => (float) $request->input('price'),
                'attributes' => [],
                'track_stock' => $trackStock,
                'stock' => $trackStock ? (int) $request->input('stock', 0) : null,
                'is_default' => true,
                'is_active' => true,
            ]];
        }

        return collect($request->validated('variants', []))
            ->values()
            ->map(function (array $variant) use ($product): array {
                $id = filled($variant['id'] ?? null) ? (int) $variant['id'] : null;
                $name = trim((string) $variant['name']);
                $trackStock = (bool) $variant['track_stock'];

                return [
                    'id' => $id,
                    'name' => $name,
                    'sku' => $this->uniqueSku($variant['sku'] ?? null, $product->name, $name, $id),
                    'price' => (float) $variant['price'],
                    'attributes' => collect($variant['attributes'] ?? [])
                        ->map(fn ($attribute) => [
                            'name' => trim((string) $attribute['name']),
                            'value' => trim((string) $attribute['value']),
                        ])
                        ->values()
                        ->all(),
                    'track_stock' => $trackStock,
                    'stock' => $trackStock ? (int) ($variant['stock'] ?? 0) : null,
                    'is_default' => (bool) $variant['is_default'],
                    'is_active' => (bool) $variant['is_active'],
                ];
            })
            ->all();
    }

    private function syncVariants(Product $product, array $payloads): void
    {
        $existingIds = collect($payloads)
            ->pluck('id')
            ->filter()
            ->map(fn ($id) => (int) $id)
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

            $variant->fill(collect($payload)->except('id')->all());
            $variant->product_id = $product->id;
            $variant->save();
        }
    }

    private function uniqueSlug(?string $requested, string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug(filled($requested) ? $requested : $name) ?: 'produk';
        $slug = $base;
        $counter = 2;

        while (
            Product::query()
                ->where('slug', $slug)
                ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
                ->exists()
        ) {
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

        while (
            ProductVariant::query()
                ->where('sku', $sku)
                ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
                ->exists()
        ) {
            $suffix = '-'.$counter;
            $sku = Str::limit($base, 100 - strlen($suffix), '').$suffix;
            $counter++;
        }

        return $sku;
    }

    private function load(Product $product): Product
    {
        return $product->load([
            'category',
            'variants' => fn ($query) => $query
                ->orderByDesc('is_default')
                ->orderBy('id'),
        ]);
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
}
