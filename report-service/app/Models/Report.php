<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    protected $fillable = [
        'title',
        'type',
        'period',
        'generated_by',
        'user_id',
        'content',
    ];

    protected $casts = [
        'content' => 'array',
    ];
}