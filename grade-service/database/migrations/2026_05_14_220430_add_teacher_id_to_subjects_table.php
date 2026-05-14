<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->string('teacher_id')->nullable()->after('code');
            $table->string('teacher_name')->nullable()->after('teacher_id');
            $table->string('description')->nullable()->after('teacher_name');
        });
    }

    public function down(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->dropColumn(['teacher_id', 'teacher_name', 'description']);
        });
    }
};
