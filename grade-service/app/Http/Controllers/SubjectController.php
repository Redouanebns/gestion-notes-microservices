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
                'name'         => 'required|string|max:255',
                'code'         => 'required|string|unique:subjects,code'
            ]);

            $subject = Subject::create(array_merge($validated, [
                'teacher_id'   => $request->input('teacher_id'),
                'teacher_name' => $request->input('teacher_name'),
                'level'        => $request->input('level'),
            ]));
            \Log::info('Subject created', $subject->toArray());

            return response()->json($subject, 201);
        } catch (\Exception $e) {
            \Log::error('Subject creation failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function update(Request $request, $id)
    {
        $subject = Subject::findOrFail($id);
        $subject->update([
            'name'         => $request->input('name', $subject->name),
            'code'         => $request->input('code', $subject->code),
            'teacher_id'   => $request->input('teacher_id', $subject->teacher_id),
            'teacher_name' => $request->input('teacher_name', $subject->teacher_name),
            'level'        => $request->input('level', $subject->level),
        ]);
        return response()->json($subject);
    }

    public function destroy($id)
    {
        Subject::findOrFail($id)->delete();
        return response()->json(['message' => 'Subject deleted']);
    }
}