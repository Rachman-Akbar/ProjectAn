<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'admin@company.local'],
            [
                'name' => 'Administrator',
                'password' => 'admin12345',
                'role' => 'admin',
                'phone' => '081200000001',
                'department' => 'Management Support',
                'is_active' => true,
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'seller@company.local'],
            [
                'name' => 'Internal Seller',
                'password' => 'seller12345',
                'role' => 'seller',
                'phone' => '081200000002',
                'department' => 'Procurement',
                'is_active' => true,
            ]
        );
    }
}
