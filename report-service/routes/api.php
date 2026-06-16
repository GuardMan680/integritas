<?php

use App\Http\Controllers\ReportController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', function (Request $request) {
    return response()->json([
        'service' => 'laravel-service',
        'status' => 'running'
    ]);
});

Route::get('/report', function (Request $request) {
    return response()->json([
        'data' => [
            'total_report' => 10,
            'report_type' => 'monthly',
            'generated_by' => 'laravel-service'
        ]
    ]);
});

Route::get('/user', function (Request $request) {
    return response()->json([
        'service' => 'laravel-service',
        'message' => 'User endpoint',
        'data' => [
            'id' => 1,
            'name' => 'Test User',
            'email' => 'user@example.com'
        ]
    ]);
});

Route::get('/report/summary', function (Request $request) {
    return response()->json([
        'service' => 'report-service',
        'summary' => [
            'total_fields' => 3,
            'total_bookings' => 10,
            'total_payments' => 5,
            'total_notifications' => 15,
            'period' => 'monthly',
            'generated_at' => now()->toIso8601String()
        ]
    ]);
});

Route::get('/report/analytics', function (Request $request) {
    return response()->json([
        'service' => 'report-service',
        'analytics' => [
            'bookings_by_type' => [
                'Futsal' => 5,
                'Badminton' => 3,
                'Tennis' => 2
            ],
            'revenue_by_month' => [
                'January' => 1500000,
                'February' => 1200000,
                'March' => 1800000
            ],
            'top_fields' => [
                ['id' => 1, 'name' => 'Lapangan Futsal A', 'bookings' => 15],
                ['id' => 2, 'name' => 'Lapangan Badminton 1', 'bookings' => 8]
            ]
        ]
    ]);
});

// ============ REPORTS CRUD (baru) ============
Route::get('/reports', [ReportController::class, 'index']);
Route::post('/reports', [ReportController::class, 'store']);
Route::get('/reports/{id}', [ReportController::class, 'show']);
Route::put('/reports/{id}', [ReportController::class, 'update']);
Route::delete('/reports/{id}', [ReportController::class, 'destroy']);