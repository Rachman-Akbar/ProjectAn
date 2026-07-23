<?php

namespace App\Services;

use App\Models\Order;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    public function checkout(array $payload): Order
    {
        $lockName = 'checkout.order-number.'.now()->format('Ymd');

        return Cache::lock($lockName, 15)->block(5, function () use ($payload): Order {
            return DB::transaction(fn () => $this->performCheckout($payload));
        });
    }

    private function performCheckout(array $payload): Order
    {
        $items = collect($payload['items'])
            ->groupBy('product_variant_id')
            ->map(fn ($rows, $variantId): array => [
                'product_id' => (int) $rows->first()['product_id'],
                'product_variant_id' => (int) $variantId,
                'quantity' => (int) $rows->sum('quantity'),
            ])
            ->values();

        $variants = ProductVariant::query()
            ->with('product.category')
            ->whereIn('id', $items->pluck('product_variant_id'))
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        $orderItems = [];
        $subtotal = 0.0;

        foreach ($items as $item) {
            $variant = $variants->get($item['product_variant_id']);
            $product = $variant?->product;

            if (! $variant || ! $product || $variant->product_id !== $item['product_id']) {
                throw ValidationException::withMessages([
                    'items' => 'Produk dan variant tidak cocok.',
                ]);
            }

            if (
                ! $variant->is_active
                || ! $product->is_active
                || $product->status !== 'published'
                || ! $product->category
                || ! $product->category->is_active
            ) {
                throw ValidationException::withMessages([
                    'items' => "{$product->name} sudah tidak tersedia.",
                ]);
            }

            if ($variant->track_stock && ($variant->stock ?? 0) < $item['quantity']) {
                throw ValidationException::withMessages([
                    'items' => "Stok {$product->name} - {$variant->name} tidak mencukupi.",
                ]);
            }

            $line = round((float) $variant->price * $item['quantity'], 2);
            $subtotal = round($subtotal + $line, 2);

            $orderItems[] = [
                'product_id' => $product->id,
                'product_variant_id' => $variant->id,
                'product_name' => $product->name,
                'product_sku' => $variant->sku,
                'product_type' => $product->type,
                'variant_name' => $variant->name,
                'variant_attributes' => array_values($variant->attributes ?? []),
                'price' => (float) $variant->price,
                'quantity' => $item['quantity'],
                'subtotal' => $line,
            ];
        }

        if (count($orderItems) !== $items->count()) {
            throw ValidationException::withMessages([
                'items' => 'Data keranjang tidak valid.',
            ]);
        }

        $order = Order::query()->create([
            'order_number' => $this->nextOrderNumber(),
            'guest_name' => trim((string) $payload['name']),
            'guest_division' => trim((string) $payload['division']),
            'guest_phone' => trim((string) $payload['phone']),
            'guest_address' => trim((string) $payload['address']),
            'guest_notes' => filled($payload['notes'] ?? null)
                ? trim((string) $payload['notes'])
                : null,
            'subtotal' => $subtotal,
            'total_amount' => $subtotal,
            'status' => 'pending',
            'payment_method' => $payload['payment_method'],
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

            if ($variant->track_stock) {
                $variant->decrement('stock', $item['quantity']);
            }
        }

        return $order->load(['items', 'statusHistories.user']);
    }

    private function nextOrderNumber(): string
    {
        $prefix = 'INV-'.now()->format('Ymd').'-';
        $latest = Order::withTrashed()
            ->where('order_number', 'like', $prefix.'%')
            ->orderByDesc('order_number')
            ->value('order_number');

        $sequence = $latest
            ? ((int) last(explode('-', $latest))) + 1
            : 1;

        return $prefix.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT);
    }
}
