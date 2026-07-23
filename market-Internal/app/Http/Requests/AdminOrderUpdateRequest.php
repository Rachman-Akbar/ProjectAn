<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminOrderUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'seller'], true);
    }

    public function rules(): array
    {
        return [
            'guest_name' => ['required', 'string', 'max:120'],
            'guest_division' => ['required', 'string', 'max:150'],
            'guest_phone' => ['required', 'string', 'max:30', 'regex:/^[0-9+()\-\s]+$/'],
            'guest_address' => ['required', 'string', 'max:3000'],
            'guest_notes' => ['nullable', 'string', 'max:3000'],
            'status' => ['required', Rule::in(['pending', 'confirmed', 'processing', 'completed', 'cancelled'])],
            'payment_status' => ['required', Rule::in(['unpaid', 'paid'])],
            'payment_method' => ['required', Rule::in(['cod', 'bank_transfer', 'internal_billing'])],
            'cancel_reason' => ['nullable', 'string', 'max:2000'],
            'admin_notes' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
