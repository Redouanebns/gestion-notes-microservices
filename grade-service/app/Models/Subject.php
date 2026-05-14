<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    protected $fillable = ['name', 'level', 'code', 'teacher_id', 'teacher_name', 'description'];

    public function grades()
    {
        return $this->hasMany(Grade::class);
    }
}
