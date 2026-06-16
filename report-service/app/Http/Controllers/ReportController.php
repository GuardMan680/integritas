<?php

namespace App\Http\Controllers;

use App\Models\Report;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function index()
    {
        $reports = Report::orderBy('created_at', 'desc')->get();
        return response()->json(['data' => $reports]);
    }

    public function show($id)
    {
        $report = Report::find($id);
        if (!$report) {
            return response()->json(['error' => 'Not found'], 404);
        }
        return response()->json(['data' => $report]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'        => 'required|string|max:255',
            'type'         => 'required|string|max:50',
            'period'       => 'nullable|string|max:50',
            'generated_by' => 'nullable|string|max:100',
            'user_id'      => 'nullable|integer',
            'content'      => 'nullable|array',
        ]);

        $report = Report::create($validated);

        return response()->json(['data' => $report], 201);
    }

    public function update(Request $request, $id)
    {
        $report = Report::find($id);
        if (!$report) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $validated = $request->validate([
            'title'        => 'sometimes|string|max:255',
            'type'         => 'sometimes|string|max:50',
            'period'       => 'nullable|string|max:50',
            'generated_by' => 'nullable|string|max:100',
            'user_id'      => 'nullable|integer',
            'content'      => 'nullable|array',
        ]);

        $report->update($validated);

        return response()->json(['data' => $report]);
    }

    public function destroy($id)
    {
        $report = Report::find($id);
        if (!$report) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $report->delete();

        return response()->json(['message' => 'Deleted']);
    }
}