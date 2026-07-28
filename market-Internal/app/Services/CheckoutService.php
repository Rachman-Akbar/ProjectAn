<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Order;
use App\Models\ProductVariant;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    public function checkout(array $payload): Order
    {
        return DB::transaction(fn (): Order => $this->performCheckout($payload), 3);
    }

    private function performCheckout(array $payload): Order
    {
        $requestedItems = collect($payload['items'])
            ->map(fn (array $item): array => [
                'product_id' => (int) $item['product_id'],
                'product_variant_id' => filled($item['product_variant_id'] ?? null)
                    ? (int) $item['product_variant_id']
                    : null,
                'variant_sku' => filled($item['variant_sku'] ?? null)
                    ? trim((string) $item['variant_sku'])
                    : null,
                'quantity' => (int) $item['quantity'],
            ])
            ->values();

        $variantsByProduct = ProductVariant::query()
            ->with(['values.attribute', 'product'])
            ->whereIn('product_id', $requestedItems->pluck('product_id')->unique())
            ->lockForUpdate()
            ->get()
            ->groupBy('product_id');

        $items = $this->resolveItems($requestedItems, $variantsByProduct)
            ->groupBy('product_variant_id')
            ->map(fn (Collection $rows): array => [
                'product_id' => (int) $rows->first()['product_id'],
                'product_variant_id' => (int) $rows->first()['product_variant_id'],
                'quantity' => (int) $rows->sum('quantity'),
            ])
            ->values();

        $variants = $variantsByProduct->flatten(1)->keyBy('id');
        $orderItems = [];
        $subtotal = 0.0;

        foreach ($items as $item) {
            $variant = $variants->get($item['product_variant_id']);
            $product = $variant?->product;

            if (! $variant || ! $product || (int) $variant->product_id !== (int) $item['product_id']) {
                throw ValidationException::withMessages(['items' => 'Produk dan variant tidak cocok.']);
            }

            if (! $variant->is_active || ! $product->is_active || $product->status !== 'published') {
                throw ValidationException::withMessages(['items' => "{$product->name} sudah tidak tersedia."]);
            }

            if ($variant->track_stock && (int) ($variant->stock ?? 0) < $item['quantity']) {
                throw ValidationException::withMessages([
                    'items' => "Stok {$product->name} - {$variant->name} tidak mencukupi.",
                ]);
            }

            $line = round((float) $variant->price * $item['quantity'], 2);
            $subtotal = round($subtotal + $line, 2);
            $variantAttributes = $variant->values
                ->map(fn ($value): array => [
                    'attribute_id' => $value->attribute_id,
                    'name' => $value->attribute?->name,
                    'slug' => $value->attribute?->slug,
                    'value' => $value->value,
                ])
                ->values()
                ->all();

            $orderItems[] = [
                'product_id' => $product->id,
                'product_variant_id' => $variant->id,
                'product_name' => $product->name,
                'product_sku' => $variant->sku,
                'product_type' => $product->type,
                'variant_name' => $variant->name,
                'variant_attributes' => $variantAttributes,
                'price' => (float) $variant->price,
                'quantity' => $item['quantity'],
                'subtotal' => $line,
            ];
        }

        if ($orderItems === []) {
            throw ValidationException::withMessages(['items' => 'Data keranjang tidak valid.']);
        }

        $customerType = $payload['customer_type'];
        $email = mb_strtolower(trim((string) $payload['email']));
        $customerData = [
            'customer_type' => $customerType,
            'name' => trim((string) $payload['name']),
            'phone' => trim((string) $payload['phone']),
            'address' => trim((string) $payload['address']),
            'nik' => $this->nullableString($payload['nik'] ?? null),
            'npwp' => $this->nullableString($payload['npwp'] ?? null),
            'province' => $this->nullableString($payload['province'] ?? null),
            'city' => $this->nullableString($payload['city'] ?? null),
            'company_name' => $this->nullableString($payload['company_name'] ?? null),
            'postal_code' => $this->nullableString($payload['postal_code'] ?? null),
            'country' => $this->nullableString($payload['country'] ?? null),
        ];

        if ($customerType === 'individual') {
            $customerData = [
                ...$customerData,
                'nik' => null,
                'npwp' => null,
                'province' => null,
                'city' => null,
                'company_name' => null,
                'postal_code' => null,
                'country' => null,
            ];
        }

        $customer = Customer::query()->updateOrCreate(
            ['email' => $email],
            $customerData
        );

        $order = Order::query()->create([
            'order_number' => $this->nextOrderNumber(),
            'customer_id' => $customer->id,
            'customer_type' => $customerType,
            'guest_email' => $email,
            'guest_name' => $customerData['name'],
            'guest_phone' => $customerData['phone'],
            'guest_address' => $customerData['address'],
            'guest_nik' => $customerData['nik'],
            'guest_npwp' => $customerData['npwp'],
            'guest_province' => $customerData['province'],
            'guest_city' => $customerData['city'],
            'guest_company_name' => $customerData['company_name'],
            'guest_postal_code' => $customerData['postal_code'],
            'guest_country' => $customerData['country'],
            'guest_notes' => $this->nullableString($payload['notes'] ?? null),
            'subtotal' => $subtotal,
            'total_amount' => $subtotal,
            'status' => 'pending',
            'payment_method' => $payload['payment_method'] ?? 'internal_billing',
            'payment_status' => 'unpaid',
        ]);

        $order->items()->createMany($orderItems);
        $order->statusHistories()->create([
            'user_id' => null,
            'from_status' => null,
            'to_status' => 'pending',
            'notes' => 'Order dibuat.',
        ]);

        foreach ($items as $item) {
            $variant = $variants->get($item['product_variant_id']);

            if ($variant?->track_stock) {
                $variant->decrement('stock', $item['quantity']);
            }
        }

        return $order->load(['items', 'statusHistories.user']);
    }

    private function resolveItems(Collection $items, Collection $variantsByProduct): Collection
    {
        return $items->map(function (array $item, int $index) use ($variantsByProduct): array {
            $variants = $variantsByProduct
                ->get($item['product_id'], collect())
                ->filter(fn (ProductVariant $variant): bool => $variant->is_active)
                ->sortByDesc('is_default')
                ->values();

            $variant = null;

            if (filled($item['product_variant_id'])) {
                $variant = $variants->firstWhere('id', $item['product_variant_id']);
            }

            if (! $variant && filled($item['variant_sku'] ?? null)) {
                $variant = $variants->firstWhere('sku', $item['variant_sku']);
            }

            if (! $variant && $variants->count() === 1) {
                $variant = $variants->first();
            }

            if (! $variant) {
                $message = $variants->count() > 1
                    ? "Pilih variant yang valid untuk produk ID {$item['product_id']}."
                    : "Variant aktif untuk produk ID {$item['product_id']} tidak ditemukan.";

                throw ValidationException::withMessages([
                    "items.{$index}.product_variant_id" => $message,
                ]);
            }

            return [
                'product_id' => $item['product_id'],
                'product_variant_id' => $variant->id,
                'quantity' => $item['quantity'],
            ];
        });
    }

    private function nextOrderNumber(): string
    {
        $prefix = 'INV-'.now()->format('Ymd').'-';
        $latest = Order::withTrashed()
            ->where('order_number', 'like', $prefix.'%')
            ->lockForUpdate()
            ->orderByDesc('order_number')
            ->value('order_number');
        $sequence = $latest ? ((int) last(explode('-', $latest))) + 1 : 1;

        return $prefix.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT);
    }

    private function nullableString(mixed $value): ?string
    {
        return filled($value) ? trim((string) $value) : null;
    }
}
