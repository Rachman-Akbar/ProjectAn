<?php

namespace App\Services;

use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function updateByAdmin(Order $order, array $data, User $actor): Order
    {
        return DB::transaction(function () use ($order, $data, $actor): Order {
            $locked = Order::query()->lockForUpdate()->findOrFail($order->id);
            $locked->load('items');

            $locked->fill([
                'guest_name' => trim($data['guest_name']),
                'guest_division' => trim($data['guest_division']),
                'guest_phone' => trim($data['guest_phone']),
                'guest_address' => trim($data['guest_address']),
                'guest_notes' => $data['guest_notes'] ?? null,
                'payment_method' => $data['payment_method'],
                'payment_status' => $data['payment_status'],
                'admin_notes' => $data['admin_notes'] ?? null,
            ]);

            $this->applyTransition(
                $locked,
                $data['status'],
                $actor,
                $data['cancel_reason'] ?? null,
                $data['admin_notes'] ?? null
            );

            $locked->save();

            return $locked->fresh()->load(['items', 'statusHistories.user']);
        });
    }

    public function transition(
        Order $order,
        string $nextStatus,
        ?User $actor = null,
        ?string $reason = null,
        ?string $notes = null
    ): Order {
        return DB::transaction(function () use ($order, $nextStatus, $actor, $reason, $notes): Order {
            $locked = Order::query()->lockForUpdate()->findOrFail($order->id);
            $locked->load('items');
            $this->applyTransition($locked, $nextStatus, $actor, $reason, $notes);
            $locked->save();

            return $locked->fresh()->load(['items', 'statusHistories.user']);
        });
    }

    public function cancelGuest(Order $order, ?string $reason): Order
    {
        return DB::transaction(function () use ($order, $reason): Order {
            $locked = Order::query()->lockForUpdate()->findOrFail($order->id);
            $locked->load('items');

            if ($locked->status !== 'pending') {
                throw ValidationException::withMessages([
                    'status' => 'Order hanya dapat dibatalkan ketika status masih pending.',
                ]);
            }

            $this->applyTransition($locked, 'cancelled', null, $reason, 'Dibatalkan oleh guest.');
            $locked->save();

            return $locked->fresh()->load(['items', 'statusHistories.user']);
        });
    }

    public function delete(Order $order, ?User $actor = null): void
    {
        DB::transaction(function () use ($order, $actor): void {
            $locked = Order::query()->lockForUpdate()->findOrFail($order->id);
            $locked->load('items');

            if (in_array($locked->status, ['pending', 'confirmed', 'processing'], true)) {
                $this->applyTransition(
                    $locked,
                    'cancelled',
                    $actor,
                    'Order dihapus oleh admin.',
                    'Stok dikembalikan sebelum soft delete.'
                );
                $locked->save();
            }

            $locked->delete();
        });
    }

    private function applyTransition(
        Order $order,
        string $nextStatus,
        ?User $actor,
        ?string $reason,
        ?string $notes
    ): void {
        $fromStatus = $order->status;

        if ($fromStatus !== 'cancelled' && $nextStatus === 'cancelled') {
            $this->restoreStock($order);
            $order->cancelled_at = now();
            $order->cancel_reason = filled($reason) ? trim($reason) : null;
        }

        if ($fromStatus === 'cancelled' && $nextStatus !== 'cancelled') {
            $this->reserveStock($order);
            $order->cancelled_at = null;
            $order->cancel_reason = null;
        }

        if ($fromStatus === 'cancelled' && $nextStatus === 'cancelled' && $reason !== null) {
            $order->cancel_reason = filled($reason) ? trim($reason) : null;
        }

        $order->status = $nextStatus;

        if ($fromStatus !== $nextStatus) {
            $order->statusHistories()->create([
                'user_id' => $actor?->id,
                'from_status' => $fromStatus,
                'to_status' => $nextStatus,
                'notes' => filled($notes) ? trim($notes) : (filled($reason) ? trim($reason) : null),
            ]);
        }
    }

    private function restoreStock(Order $order): void
    {
        foreach ($order->items as $item) {
            $variant = ProductVariant::query()->lockForUpdate()->find($item->product_variant_id);

            if ($variant?->track_stock) {
                $variant->increment('stock', $item->quantity);
            }
        }
    }

    private function reserveStock(Order $order): void
    {
        $variants = [];

        foreach ($order->items as $item) {
            $variant = ProductVariant::query()->lockForUpdate()->find($item->product_variant_id);

            if (! $variant || ! $variant->is_active) {
                throw ValidationException::withMessages([
                    'status' => "Variant {$item->variant_name} sudah tidak tersedia.",
                ]);
            }

            if ($variant->track_stock && ($variant->stock ?? 0) < $item->quantity) {
                throw ValidationException::withMessages([
                    'status' => "Stok {$item->product_name} - {$item->variant_name} tidak mencukupi untuk membuka kembali order.",
                ]);
            }

            $variants[$item->id] = $variant;
        }

        foreach ($order->items as $item) {
            $variant = $variants[$item->id];

            if ($variant->track_stock) {
                $variant->decrement('stock', $item->quantity);
            }
        }
    }
}
