<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'guest_name' => $this->guest_name,
            'guest_division' => $this->guest_division,
            'guest_phone' => $this->guest_phone,
            'guest_address' => $this->guest_address,
            'guest_notes' => $this->guest_notes,
            'subtotal' => (float) $this->subtotal,
            'total_amount' => (float) $this->total_amount,
            'status' => $this->status,
            'payment_method' => $this->payment_method,
            'payment_status' => $this->payment_status,
            'cancelled_at' => $this->cancelled_at,
            'cancel_reason' => $this->cancel_reason,
            'admin_notes' => $this->when($request->user() !== null, $this->admin_notes),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'status_histories' => $this->whenLoaded('statusHistories', fn () => $this->statusHistories->map(fn ($history) => [
                'id' => $history->id,
                'from_status' => $history->from_status,
                'to_status' => $history->to_status,
                'notes' => $history->notes,
                'changed_by' => $history->relationLoaded('user') && $history->user ? [
                    'id' => $history->user->id,
                    'name' => $history->user->name,
                ] : null,
                'created_at' => $history->created_at,
            ])->values()),
            'deleted_at' => $this->deleted_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
