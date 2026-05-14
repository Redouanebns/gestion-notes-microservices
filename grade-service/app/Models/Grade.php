<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Grade extends Model
{
    protected $fillable = [
        'student_id',
        'subject_id',
        'value',
        'semester',
        'comment'
    ];
    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }
}
