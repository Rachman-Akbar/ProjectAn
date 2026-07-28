<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variant_values', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->foreignId('attribute_id')->constrained('product_attributes')->cascadeOnDelete();
            $table->string('value');
            $table->unique(['variant_id', 'attribute_id'], 'product_variant_attribute_unique');
            $table->index(['attribute_id', 'value'], 'product_variant_value_lookup_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variant_values');
    }
};
