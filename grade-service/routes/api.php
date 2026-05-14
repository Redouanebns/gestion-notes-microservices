<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\GradeController;

// Health check route
Route::get('/health', function () {
    return response()->json([
        'service' => 'grade-service',
        'status' => 'OK'
    ]);
});

// Protected routes with JWT middleware
Route::middleware('jwt')->group(function () {

    // Subjects routes
    Route::get('/subjects', [SubjectController::class, 'index']);
    Route::post('/subjects', [SubjectController::class, 'store']);

    // Grades routes
    Route::get('/grades', [GradeController::class, 'index']);
    Route::post('/grades', [GradeController::class, 'store']);
});