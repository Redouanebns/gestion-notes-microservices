<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    public function index()
    {
        return Subject::all();
    }

    public function store(Request $request)
    {
        \Log::info('Subject creation request', $request->all());
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'code' => 'required|string|unique:subjects,code'
            ]);

            $subject = Subject::create($validated);
            \Log::info('Subject created', $subject->toArray());

            return response()->json($subject, 201);
        } catch (\Exception $e) {
            \Log::error('Subject creation failed', ['error' => $e.getMessage()]);
            throw $e;
        }
    }
}