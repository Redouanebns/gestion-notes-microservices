<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Services\RabbitMQPublisher;
use Illuminate\Http\Request;

class GradeController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->attributes->get('user');
        
        $query = Grade::with('subject')->latest();
        
        if (isset($user->role) && $user->role === 'student') {
            $studentId = $request->query('student_id');
            if ($studentId) {
                $query->where('student_id', $studentId);
            } else {
                $query->where('student_id', $user->id)
                      ->orWhere('student_id', $user->email);
            }
        }

        return $query->get();
    }

    public function store(Request $request, RabbitMQPublisher $publisher)
    {
        $user = $request->attributes->get('user');
        
        if (!isset($user->role) || !in_array($user->role, ['teacher', 'admin'])) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $validated = $request->validate([
            'student_id' => 'required|string',
            'subject_id' => 'required|exists:subjects,id',
            'value'      => 'required|numeric|min:0|max:20',
            'semester'   => 'required|string',
            'comment'    => 'nullable|string'
        ]);

        $subject = \App\Models\Subject::findOrFail($validated['subject_id']);

        if ($user->role === 'teacher' && $subject->teacher_id !== $user->id) {
            return response()->json(['message' => 'Accès refusé. Vous ne pouvez noter que vos matières.'], 403);
        }

        $grade = Grade::create($validated);
        $grade->load('subject');

        $publisher->publish('grade_created', [
            'event'      => 'GRADE_CREATED',
            'student_id' => $grade->student_id,
            'subject'    => $grade->subject->name,
            'grade'      => $grade->value,
            'semester'   => $grade->semester,
            'created_at' => $grade->created_at
        ]);

        return response()->json($grade, 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->attributes->get('user');

        if (!isset($user->role) || !in_array($user->role, ['teacher', 'admin'])) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $grade = Grade::with('subject')->findOrFail($id);

        if ($user->role === 'teacher' && $grade->subject->teacher_id !== $user->id) {
            return response()->json(['message' => 'Accès refusé. Vous ne pouvez modifier que les notes de vos matières.'], 403);
        }

        $validated = $request->validate([
            'value'    => 'required|numeric|min:0|max:20',
            'semester' => 'sometimes|string',
            'comment'  => 'nullable|string'
        ]);

        $grade->update($validated);

        return response()->json($grade);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->attributes->get('user');

        if (!isset($user->role) || !in_array($user->role, ['teacher', 'admin'])) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $grade = Grade::with('subject')->findOrFail($id);

        if ($user->role === 'teacher' && $grade->subject->teacher_id !== $user->id) {
            return response()->json(['message' => 'Accès refusé. Vous ne pouvez supprimer que les notes de vos matières.'], 403);
        }

        $grade->delete();

        return response()->json(['message' => 'Note supprimée avec succès.']);
    }
}
