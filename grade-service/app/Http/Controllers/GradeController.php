<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Services\RabbitMQPublisher;
use Illuminate\Http\Request;

class GradeController extends Controller
{
    public function index()
    {
        return Grade::with('subject')
            ->latest()
            ->get();
    }

    public function store(
        Request $request,
        RabbitMQPublisher $publisher
    ) {
        $validated = $request->validate([
            'student_id' => 'required|string',
            'subject_id' => 'required|exists:subjects,id',
            'value' => 'required|numeric|min:0|max:20',
            'semester' => 'required|string',
            'comment' => 'nullable|string'
        ]);

        // Create grade
        $grade = Grade::create($validated);

        // Load related subject
        $grade->load('subject');

        // Publish asynchronous event
        // The Grade Service does not directly contact
        // the Notification Service
        $publisher->publish('grade_created', [
            'event' => 'GRADE_CREATED',
            'student_id' => $grade->student_id,
            'subject' => $grade->subject->name,
            'grade' => $grade->value,
            'semester' => $grade->semester,
            'created_at' => $grade->created_at
        ]);

        return response()->json($grade, 201);
    }
}
