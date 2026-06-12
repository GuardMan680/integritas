<?php
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'service' => 'report-service',
        'language' => 'PHP',
        'framework' => 'Laravel',
        'message' => 'Report Service berjalan di dalam Docker'
    ]);
});

Route::get('/health', function () {
    return response()->json([
        'service' => 'report-service',
        'status' => 'running'
    ]);
});

Route::get('/report/summary', function () {
    $fieldUrl    = env('FIELD_SERVICE_URL',   'http://field-service:3001');
    $bookingUrl  = env('BOOKING_SERVICE_URL', 'http://booking-service:3002');
    $paymentUrl  = env('PAYMENT_SERVICE_URL', 'http://payment-service:3003');

    $fields   = json_decode(file_get_contents("$fieldUrl/fields"),   true);
    $bookings = json_decode(file_get_contents("$bookingUrl/bookings"), true);
    $payments = json_decode(file_get_contents("$paymentUrl/payments"), true);

    $totalRevenue = 0;
    foreach ($payments['data'] as $p) {
        if ($p['status'] === 'paid') $totalRevenue += $p['amount'];
    }

    return response()->json([
        'service' => 'report-service',
        'message' => 'Laporan rekap sistem penyewaan lapangan',
        'data' => [
            'total_fields'   => count($fields['data']),
            'total_bookings' => count($bookings['data']),
            'total_payments' => count($payments['data']),
            'total_revenue'  => $totalRevenue,
            'report_type'    => 'summary',
            'generated_by'   => 'Laravel Report Service'
        ]
    ]);
});

Route::get('/report/fields', function () {
    $fieldUrl = env('FIELD_SERVICE_URL', 'http://field-service:3001');
    $fields = json_decode(file_get_contents("$fieldUrl/fields"), true);
    return response()->json([
        'service' => 'report-service',
        'message' => 'Laporan daftar lapangan',
        'data' => $fields['data']
    ]);
});
