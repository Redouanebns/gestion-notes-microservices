<?php

namespace App\Http\Middleware;

use Closure;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Request;

class JwtMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $header = $request->header('Authorization');

        // Check if token exists
        if (!$header || !str_starts_with($header, 'Bearer ')) {
            return response()->json([
                'message' => 'No token provided'
            ], 401);
        }

        // Extract token
        $token = substr($header, 7);

        try {
            // Decode JWT token
            $decoded = JWT::decode(
                $token,
                new Key(config('app.jwt_secret'), 'HS256')
            );

            // Store user data in request
            $request->attributes->set('user', $decoded);

        } catch (\Exception $e) {
            \Log::error('JWT Decoding Failed', [
                'error' => $e->getMessage(),
                'secret_configured' => !!config('app.jwt_secret'),
                'token_prefix' => substr($token, 0, 10) . '...'
            ]);
            return response()->json([
                'message' => 'Invalid or expired token'
            ], 401);
        }

        return $next($request);
    }
}