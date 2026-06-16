<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('type', 50);              
            $table->string('period', 50)->nullable(); 
            $table->string('generated_by')->nullable();
            $table->unsignedBigInteger('user_id')->nullable(); 
            $table->json('content')->nullable();      
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};