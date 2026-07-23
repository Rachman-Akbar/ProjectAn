<?php

namespace App\Http\Controllers;

use App\Http\Requests\AdminOrderUpdateRequest;
use App\Http\Requests\CheckoutRequest;
use App\Http\Requests\GuestOrderCancelRequest;
use App\Http\Requests\GuestOrderLookupRequest;
use App\Http\Requests\GuestOrderUpdateRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\CheckoutService;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function checkout(CheckoutRequest $request, CheckoutService $checkout): JsonResponse
    {
        return (new OrderResource($checkout->checkout($request->validated())))
            ->response()
            ->setStatusCode(201);
    }

    public function track(GuestOrderLookupRequest $request): OrderResource
    {
        return new OrderResource($this->findOwnedOrder(
            $request->validated('order_number'),
            $request->validated('phone')
        ));
    }

    public function updateGuest(GuestOrderUpdateRequest $request, string $orderNumber): OrderResource
    {
        $owned = $this->findOwnedOrder($orderNumber, $request->validated('phone_verification'));

        $order = DB::transaction(function () use ($request, $owned): Order {
            $locked = Order::query()->lockForUpdate()->findOrFail($owned->id);

            if ($locked->status !== 'pending') {
                throw ValidationException::withMessages([
                    'status' => 'Data buyer hanya dapat diubah ketika order masih pending.',
                ]);
            }

            $locked->update([
                'guest_name' => trim($request->validated('name')),
                'guest_division' => trim($request->validated('division')),
                'guest_phone' => trim($request->validated('phone')),
                'guest_address' => trim($request->validated('address')),
                'guest_notes' => filled($request->validated('notes')) ? trim($request->validated('notes')) : null,
            ]);

            return $locked->fresh()->load(['items', 'statusHistories.user']);
        });

        return new OrderResource($order);
    }

    public function cancelGuest(GuestOrderCancelRequest $request, string $orderNumber, OrderService $orders): OrderResource
    {
        $order = $this->findOwnedOrder($orderNumber, $request->validated('phone'));

        return new OrderResource($orders->cancelGuest($order, $request->validated('cancel_reason')));
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'status' => ['nullable', Rule::in(['pending', 'confirmed', 'processing', 'completed', 'cancelled'])],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'with_deleted' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $orders = Order::query()
            ->with('items')
            ->when((bool) ($validated['with_deleted'] ?? false), fn ($query) => $query->withTrashed())
            ->when(filled($validated['status'] ?? null), fn ($query) => $query->where('status', $validated['status']))
            ->when(filled($validated['date_from'] ?? null), fn ($query) => $query->whereDate('created_at', '>=', $validated['date_from']))
            ->when(filled($validated['date_to'] ?? null), fn ($query) => $query->whereDate('created_at', '<=', $validated['date_to']))
            ->when(filled($validated['search'] ?? null), function ($query) use ($validated): void {
                $search = trim($validated['search']);
                $query->where(fn ($query) => $query
                    ->where('order_number', 'like', "%{$search}%")
                    ->orWhere('guest_name', 'like', "%{$search}%")
                    ->orWhere('guest_phone', 'like', "%{$search}%")
                    ->orWhere('guest_division', 'like', "%{$search}%"));
            })
            ->latest()
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return OrderResource::collection($orders);
    }

    public function store(CheckoutRequest $request, CheckoutService $checkout): JsonResponse
    {
        return $this->checkout($request, $checkout);
    }

    public function show(int $order): OrderResource
    {
        $model = Order::withTrashed()->findOrFail($order);

        return new OrderResource($model->load(['items', 'statusHistories.user']));
    }

    public function update(AdminOrderUpdateRequest $request, Order $order, OrderService $orders): OrderResource
    {
        return new OrderResource($orders->updateByAdmin($order, $request->validated(), $request->user()));
    }

    public function destroy(Request $request, Order $order, OrderService $orders)
    {
        $orders->delete($order, $request->user());

        return response()->noContent();
    }

    private function findOwnedOrder(string $orderNumber, string $phone): Order
    {
        return Order::query()
            ->where('order_number', trim($orderNumber))
            ->where('guest_phone', trim($phone))
            ->with(['items', 'statusHistories.user'])
            ->firstOrFail();
    }
}
