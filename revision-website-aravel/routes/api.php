<?php

use Illuminate\Support\Facades\Route;

// Laravel no longer serves revision APIs. The active REST API lives in backend-go/.
Route::fallback(fn () => response()->json([
    'message' => 'Laravel API routes are disabled. Use the Go backend API at http://localhost:8080.',
    'migratedEndpoints' => ['/health', '/api/health', '/api/revisions', '/api/revisions/{id}'],
], 410));
