# Fragment System - Quick Reference Guide

## API Endpoints

### Base URL
```
http://localhost:5000/api/fragments
```

All endpoints require JWT authentication via `Authorization: Bearer {token}` header.

---

## GET Endpoints

### 1. Get Fragments by File ID
```
GET /api/fragments/file/:fileId
```

**Example:**
```bash
curl http://localhost:5000/api/fragments/file/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "file_id": 1,
      "lecture_id": 5,
      "time_slot_id": 10,
      "fragment_order": 0,
      "start_seconds": 0,
      "end_seconds": 900,
      "duration": 900,
      "fragment_path": "./uploads/fragments/1_fragment_0.mp3",
      "transcript": null,
      "language": null,
      "created_at": "2026-03-28T02:15:00Z"
    }
  ],
  "count": 3
}
```

---

### 2. Get Fragments by Lecture ID
```
GET /api/fragments/lecture/:lectureId
```

**Example:**
```bash
curl http://localhost:5000/api/fragments/lecture/5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** Same structure as above, filtered by lecture

---

### 3. Get Fragments by Time Slot ID
```
GET /api/fragments/timeslot/:timeSlotId
```

**Example:**
```bash
curl http://localhost:5000/api/fragments/timeslot/10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response Includes:**
- Fragment details
- Time slot information (start_time, end_time, day_of_week)

---

### 4. Get Fragment Statistics
```
GET /api/fragments/stats/:fileId
```

**Example:**
```bash
curl http://localhost:5000/api/fragments/stats/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_fragments": 3,
    "total_files": 1,
    "total_lectures": 1,
    "total_time_slots": 1,
    "avg_fragment_duration": "900.00",
    "total_duration": 2700
  }
}
```

---

## POST Endpoints

### 1. Process Single File into Fragments
```
POST /api/fragments/process/:fileId?lectureId=OPTIONAL&timeSlotId=OPTIONAL
```

**Parameters:**
- `fileId` (path) - Sound file ID
- `lectureId` (query, optional) - Link to specific lecture
- `timeSlotId` (query, optional) - Link to specific time slot

**Example:**
```bash
curl -X POST "http://localhost:5000/api/fragments/process/1?lectureId=5&timeSlotId=10" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "✅ Processed 3 fragments",
  "data": [
    {
      "id": 1,
      "file_id": 1,
      "lecture_id": 5,
      "time_slot_id": 10,
      "fragment_order": 0,
      "start_seconds": 0,
      "end_seconds": 900,
      "duration": 900,
      "fragment_path": "./uploads/fragments/1_fragment_0.mp3",
      "created_at": "2026-03-28T02:15:00Z"
    },
    // ... more fragments
  ]
}
```

---

### 2. Process All Sound Files (Bulk)
```
POST /api/fragments/process-all
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/fragments/process-all \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "✅ Processed 10 files, 0 errors",
  "results": [
    {
      "file_id": 1,
      "lecture_id": 5,
      "status": "success",
      "fragments_created": 3
    },
    {
      "file_id": 2,
      "status": "error",
      "error": "File not found"
    }
  ],
  "summary": {
    "total_files": 10,
    "successful": 9,
    "errors": 1
  }
}
```

---

## DELETE Endpoints

### 1. Delete Fragments for a File
```
DELETE /api/fragments/file/:fileId
```

**Example:**
```bash
curl -X DELETE http://localhost:5000/api/fragments/file/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "✅ Deleted 3 fragments",
  "deleted_count": 3
}
```

---

## Command-Line Usage

### Process Fragments via CLI
```bash
cd backend
node process-fragments.mjs [database]
```

**Options:**
- `neon` (default) - Use Neon Cloud database
- `local` - Use local PostgreSQL

**Example:**
```bash
node process-fragments.mjs neon
```

**Output:**
```
╔════════════════════════════════════════╗
║  AUDIO FRAGMENT PROCESSING UTILITY     ║
║  Splits audio files into 15-min chunks║
╚════════════════════════════════════════╝

📍 Using database: NEON
✅ Connected to database

📥 Fetching sound files from database...
✅ Found 5 sound files

📄 Processing file 1: classroom_recording.mp3
   🔄 Creating fragments for file 1...
      ✅ Fragment 0 created: id=1
      ✅ Fragment 1 created: id=2
      ✅ Fragment 2 created: id=3

═══════════════════════════════════════════════════════════════
📊 Fragment Processing Summary
═══════════════════════════════════════════════════════════════
✅ Successfully processed: 5 files
⏭️  Skipped (already fragmented): 0 files
❌ Errors: 0 files
📦 Total files: 5
═══════════════════════════════════════════════════════════════
```

---

## Common Use Cases

### Use Case 1: Get all fragments for a specific class
```bash
# First, find the lecture ID for your class
curl http://localhost:5000/api/lectures/class/5 \
  -H "Authorization: Bearer TOKEN"

# Then, get fragments for that lecture
curl http://localhost:5000/api/fragments/lecture/45 \
  -H "Authorization: Bearer TOKEN"
```

### Use Case 2: Analyze a specific time slot
```bash
curl http://localhost:5000/api/fragments/timeslot/10 \
  -H "Authorization: Bearer TOKEN"
```

### Use Case 3: Check how many fragments exist for a file
```bash
curl http://localhost:5000/api/fragments/stats/1 \
  -H "Authorization: Bearer TOKEN"
```

### Use Case 4: Re-process a file
```bash
# First delete old fragments
curl -X DELETE http://localhost:5000/api/fragments/file/1 \
  -H "Authorization: Bearer TOKEN"

# Then process again
curl -X POST http://localhost:5000/api/fragments/process/1 \
  -H "Authorization: Bearer TOKEN"
```

### Use Case 5: Bulk process all files
```bash
curl -X POST http://localhost:5000/api/fragments/process-all \
  -H "Authorization: Bearer TOKEN"
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 404 | Fragment or resource not found |
| 401 | Unauthorized (missing or invalid token) |
| 500 | Server error (check logs) |

---

## Fragment Properties Explained

| Property | Type | Description |
|----------|------|-------------|
| `id` | integer | Unique fragment ID |
| `file_id` | integer | Parent sound file ID |
| `lecture_id` | integer | Associated lecture (nullable) |
| `time_slot_id` | integer | Class time slot (nullable) |
| `fragment_order` | integer | Sequence number (0, 1, 2...) |
| `start_seconds` | decimal | Start time in seconds |
| `end_seconds` | decimal | End time in seconds |
| `duration` | decimal | Length in seconds (usually 900 = 15 min) |
| `fragment_path` | string | File path to audio segment |
| `transcript` | string | OCR/transcription text (nullable) |
| `language` | string | Language code (e.g., 'ar' for Arabic) |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

---

## Troubleshooting

### Problem: 401 Unauthorized
**Solution:** Ensure your JWT token is valid and included in the `Authorization` header

### Problem: 404 Not Found
**Solution:** Verify the file/lecture/timeslot ID exists in the database

### Problem: Fragments not being created
**Solution:** Check server logs and ensure:
- Audio file exists at the path
- Database connection is working
- FFmpeg is installed

### Problem: Empty returns
**Solution:** Check if fragments were actually created:
```bash
curl http://localhost:5000/api/fragments/stats/1 \
  -H "Authorization: Bearer TOKEN"
```

---

## Performance Tips

1. **Batch Processing:** Use `/process-all` during off-peak hours
2. **Filtering:** Use specific endpoints (by lecture/timeslot) to reduce results
3. **Caching:** Cache statistics for frequently accessed files
4. **Monitoring:** Track fragment creation success rates

---

**Last Updated:** March 28, 2026  
**API Version:** 1.0  
**Fragment Duration:** 15 minutes
