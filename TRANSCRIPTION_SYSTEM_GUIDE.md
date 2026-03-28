# Speech-to-Text Transcription System

## Overview

The transcription system processes audio fragments from lectures and generates complete, concatenated text transcriptions. Each lecture can have multiple 15-minute audio fragments, which are all transcribed and combined into a single text entry in the lecture table.

### Architecture

```
Sound File (audio.mp3)
    ↓
    ├─→ Lecture 1 (Monday 8-8:45am)
    │       ├─→ Fragment 1 (0-15 min) → Whisper API → Text A
    │       ├─→ Fragment 2 (15-30 min) → Whisper API → Text B
    │       └─→ Fragment 3 (30-45 min) → Whisper API → Text C
    │       │
    │       └─→ Concatenate: "Text A Text B Text C" → Save to lecture.transcript
    │
    ├─→ Lecture 2 (Monday 10-10:45am)
    │       ├─→ Fragment 1...
    │       └─→ Concatenate → Save to lecture.transcript
    │
    └─→ Lecture 3 (Tuesday 8-8:45am)
            └─→ Concatenate → Save to lecture.transcript
```

## Data Flow

### 1. **Fragment Source**
Audio fragments are created by the [Fragment System](./FRAGMENTS_SYSTEM_GUIDE.md):
- 15-minute segments from audio files
- Stored in `fragments` table
- Linked to lectures and time slots

### 2. **Transcription Process**

```
For Each Lecture:
  1. Retrieve all fragments (ordered by fragment_order)
  2. For each fragment:
     - Send to OpenAI Whisper API
     - Get text response
     - Append to array
  3. Join all text with spaces
  4. Save to lecture table (lecture.transcript)
  5. Update language field (set to 'ar')
```

### 3. **Database Updates**

The `lecture` table receives:
- `transcript` column: Complete concatenated text
- `language` column: 'ar' (Arabic)
- `updated_at` column: Current timestamp

```sql
UPDATE lecture
SET transcript = 'Text A Text B Text C...',
    language = 'ar',
    updated_at = NOW()
WHERE id = $lecture_id
```

**Linked Data:**
- `sound_files`: Parent file containing all lectures
- `fragments`: Child fragments being transcribed
- `section_time_slots`: Schedule information

## API Endpoints

### Transcription Processing

#### **POST /api/transcriptions/lecture/:lectureId**
Transcribe all fragments for a single lecture

**Request:**
```bash
curl -X POST http://localhost:5000/api/transcriptions/lecture/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"language": "ar"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Lecture transcription completed successfully",
  "data": {
    "lecture_id": 1,
    "file_id": 5,
    "transcript_length": 2847,
    "language": "ar",
    "updated_at": "2026-03-28T10:30:00.000Z"
  }
}
```

**Status Codes:**
- `200`: Success
- `500`: Transcription error
- `401`: Unauthorized

---

#### **POST /api/transcriptions/file/:fileId**
Transcribe all lectures for a sound file

**Request:**
```bash
curl -X POST http://localhost:5000/api/transcriptions/file/5 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "File transcriptions completed",
  "data": {
    "file_id": 5,
    "total_lectures": 3,
    "successful": 3,
    "failed": 0,
    "results": [
      {
        "lecture_id": 1,
        "status": "success",
        "transcript_length": 2847
      },
      {
        "lecture_id": 2,
        "status": "success",
        "transcript_length": 3102
      },
      {
        "lecture_id": 3,
        "status": "success",
        "transcript_length": 2654
      }
    ]
  }
}
```

---

#### **POST /api/transcriptions/all**
Transcribe all lectures across all files

**Request:**
```bash
curl -X POST http://localhost:5000/api/transcriptions/all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "All transcriptions completed",
  "data": {
    "total_processed": 12,
    "successful": 12,
    "failed": 0,
    "results": [
      {
        "lecture_id": 1,
        "status": "success",
        "transcript_length": 2847
      },
      // ... more results
    ]
  }
}
```

---

### Retrieval & Querying

#### **GET /api/transcriptions/lecture/:lectureId**
Get lecture with full transcription data

**Request:**
```bash
curl -X GET http://localhost:5000/api/transcriptions/lecture/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "file_id": 5,
    "time_slot_id": 10,
    "transcript": "الدرس الأول عن الرياضيات...",
    "language": "ar",
    "duration": 2700,
    "filename": "lecture_monday.mp3",
    "start_time": "08:00:00",
    "end_time": "08:45:00",
    "day_of_week": "Monday",
    "created_at": "2026-03-20T08:00:00.000Z",
    "updated_at": "2026-03-28T10:30:00.000Z"
  }
}
```

---

#### **GET /api/transcriptions/file/:fileId**
Get all lectures with transcriptions for a file

**Request:**
```bash
curl -X GET http://localhost:5000/api/transcriptions/file/5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "file_id": 5,
    "count": 3,
    "lectures": [
      {
        "id": 1,
        "file_id": 5,
        "transcript": "النص الأول...",
        "language": "ar",
        "filename": "lecture_monday.mp3",
        "start_time": "08:00:00",
        "end_time": "08:45:00",
        "day_of_week": "Monday"
      },
      // ... more lectures
    ]
  }
}
```

---

#### **GET /api/transcriptions/status/:lectureId**
Get transcription status for a lecture

**Request:**
```bash
curl -X GET http://localhost:5000/api/transcriptions/status/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "file_id": 5,
    "transcript": "الدرس الأول...",
    "language": "ar",
    "fragment_count": 3,
    "total_duration": "45.00",
    "status": "completed",
    "created_at": "2026-03-20T08:00:00.000Z",
    "updated_at": "2026-03-28T10:30:00.000Z"
  }
}
```

---

#### **GET /api/transcriptions/statistics**
Get overall transcription statistics

**Request:**
```bash
curl -X GET http://localhost:5000/api/transcriptions/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_lectures": 12,
    "transcribed_lectures": 12,
    "pending_lectures": 0,
    "avg_transcript_length": "2814.33",
    "longest_transcript": 3500,
    "shortest_transcript": 2200,
    "total_text_length": 33772
  }
}
```

---

### Cleanup & Re-processing

#### **DELETE /api/transcriptions/lecture/:lectureId**
Clear transcript from a lecture for re-transcription

**Request:**
```bash
curl -X DELETE http://localhost:5000/api/transcriptions/lecture/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Lecture transcript cleared",
  "data": {
    "lecture_id": 1,
    "transcript": null
  }
}
```

## CLI Utility

### Command-Line Processing

Process all lectures using the CLI utility:

```bash
# Process against Neon Cloud Database
node process-transcriptions.mjs neon

# Or for local PostgreSQL
node process-transcriptions.mjs local
```

### CLI Output Example

```
✅ Connected to Neon Cloud Database
🌍 Starting transcription processing...

📊 Found 12 lectures to process

[1/12]
🔄 Processing lecture 1...
📚 Transcribing 3 fragments for lecture 1...
🎤 Transcribing fragment: fragment_1_L1.mp3
✅ Fragment transcribed: النص الأول من الدرس...
🎤 Transcribing fragment: fragment_2_L1.mp3
✅ Fragment transcribed: النص الثاني من الدرس...
🎤 Transcribing fragment: fragment_3_L1.mp3
✅ Fragment transcribed: النص الثالث من الدرس...
✅ Lecture 1 transcribed: 2847 characters, 450 words

[2/12]
🔄 Processing lecture 2...
...

═══════════════════════════════════════════════
📊 TRANSCRIPTION PROCESSING STATISTICS
═══════════════════════════════════════════════
✅ Successfully processed: 12
❌ Failed: 0
📊 Total lectures: 12
📝 Total text generated: 33772 characters
⏱️  Total duration: 245s
⏱️  Average per lecture: 20.42s
═══════════════════════════════════════════════

✨ Transcription processing complete!
```

## Service Functions

### TypeScript Service API

All functions available in `src/services/transcriptionService.ts`:

#### **transcribeFragment(fragmentPath)**
Transcribe a single audio fragment

```typescript
const text = await transcribeFragment('./uploads/fragments/fragment_1.mp3');
// Returns: "النص المُستخْرج من الملف الصوتي"
```

#### **getLectureFragmentsOrdered(lectureId)**
Get ordered fragments for transcription

```typescript
const fragments = await getLectureFragmentsOrdered(1);
// Returns: [
//   { id: 1, fragment_order: 1, fragment_path: "...", lecture_id: 1 },
//   { id: 2, fragment_order: 2, fragment_path: "...", lecture_id: 1 },
//   ...
// ]
```

#### **transcribeLectureFragments(lectureId)**
Transcribe all fragments and concatenate

```typescript
const fullText = await transcribeLectureFragments(1);
// Returns: "النص الأول النص الثاني النص الثالث"
```

#### **updateLectureTranscript(lectureId, transcript, language)**
Save transcript to lecture table

```typescript
const result = await updateLectureTranscript(1, "النص الكامل", "ar");
// Updates lecture record with transcript
```

#### **processLectureTranscription(lectureId, language)**
Complete workflow for a single lecture

```typescript
const lecture = await processLectureTranscription(1, "ar");
// Transcribes all fragments and saves to database
```

#### **processFileTranscriptions(fileId)**
Process all lectures for a file

```typescript
const results = await processFileTranscriptions(5);
// Returns: [
//   { lecture_id: 1, status: "success", transcript_length: 2847 },
//   { lecture_id: 2, status: "success", transcript_length: 3102 },
//   ...
// ]
```

#### **processAllTranscriptions()**
Process all lectures system-wide

```typescript
const summary = await processAllTranscriptions();
// Returns: {
//   total: 12,
//   successful: 12,
//   failed: 0,
//   results: [...]
// }
```

## Database Schema

### Lecture Table (Modified)

```sql
CREATE TABLE lecture (
  id SERIAL PRIMARY KEY,
  file_id INTEGER NOT NULL REFERENCES sound_files(file_id),
  time_slot_id INTEGER REFERENCES section_time_slots(time_slot_id),
  transcript TEXT,              -- NEW: Full concatenated transcript
  language VARCHAR(2),          -- NEW: Language code (e.g., 'ar', 'en')
  duration INTEGER,             -- Duration in seconds
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient transcript queries
CREATE INDEX idx_lecture_transcript ON lecture (transcript);
CREATE INDEX idx_lecture_language ON lecture (language);
```

### Fragments Table (Existing)

```sql
CREATE TABLE fragments (
  id SERIAL PRIMARY KEY,
  file_id INTEGER NOT NULL REFERENCES sound_files(file_id),
  lecture_id INTEGER REFERENCES lecture(id),
  time_slot_id INTEGER REFERENCES section_time_slots(time_slot_id),
  fragment_order INTEGER,       -- Order for concatenation
  start_seconds DECIMAL(10, 2),
  end_seconds DECIMAL(10, 2),
  duration DECIMAL(10, 2),
  fragment_path VARCHAR(255),
  transcript TEXT,              -- Individual fragment text (optional)
  language VARCHAR(2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fragments_lecture_id ON fragments(lecture_id);
CREATE INDEX idx_fragments_order ON fragments(lecture_id, fragment_order);
```

## Workflow Examples

### Example 1: Simple Lecture Transcription

```bash
# 1. Fragments already exist for lecture 1

# 2. Transcribe the lecture
curl -X POST http://localhost:5000/api/transcriptions/lecture/1 \
  -H "Authorization: Bearer TOKEN"

# 3. Retrieve the transcript
curl -X GET http://localhost:5000/api/transcriptions/lecture/1 \
  -H "Authorization: Bearer TOKEN"

# Expected result:
# lecture.transcript = "النص من الجزء الأول النص من الجزء الثاني النص من الجزء الثالث"
# lecture.language = "ar"
# lecture.updated_at = current timestamp
```

### Example 2: Batch Processing All Files

```bash
# Process all lectures in the database
node process-transcriptions.mjs neon

# Results:
# - All lectures with fragments get transcribed
# - Each lecture gets a complete transcript
# - Statistics show success/failure rates
```

### Example 3: Check Status and Re-process

```bash
# Check transcription status
curl -X GET http://localhost:5000/api/transcriptions/status/1 \
  -H "Authorization: Bearer TOKEN"

# If needed, clear the transcript
curl -X DELETE http://localhost:5000/api/transcriptions/lecture/1 \
  -H "Authorization: Bearer TOKEN"

# Re-transcribe
curl -X POST http://localhost:5000/api/transcriptions/lecture/1 \
  -H "Authorization: Bearer TOKEN"
```

## Configuration

### Environment Variables

```bash
# OpenAI Whisper API
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxx

# Database
NEON_DATABASE_URL=postgresql://user:pass@host/db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=firasah_db
```

### Settings

**Language Detection:**
- Default: `ar` (Arabic)
- Override per request: `{"language": "ar"}`

**Whisper API Parameters:**
- Model: `whisper-1` (only available model)
- Response Format: `text` (for simplicity)
- Language: `ar` (configurable)

**Timeout:**
- Fragment transcription: 60 seconds
- File processing: 15 minutes
- Batch processing: No timeout (async)

## Error Handling

### Common Errors

**Error: "No fragments found for lecture"**
- Cause: Lecture has no related fragments
- Solution: Run fragment processing first

**Error: "Fragment file not found"**
- Cause: Fragment path is invalid
- Solution: Verify fragments directory and file permissions

**Error: "OpenAI API key invalid"**
- Cause: Missing or incorrect OPENAI_API_KEY
- Solution: Update .env with valid API key

**Error: "Database connection failed"**
- Cause: Invalid connection string
- Solution: Verify NEON_DATABASE_URL or local Postgres

### Retry Strategy

- Automatic retry on transient API errors
- Manual re-transcription via DELETE then POST
- No data loss on partial failures

## Performance Considerations

### Timing

- **Per Fragment:** ~15-30 seconds (dep. on Whisper API)
- **Per Lecture (3 fragments):** ~45-90 seconds
- **Full Database:** 2-5 minutes (for 12 lectures)

### Optimization

**Parallel Processing:**
```typescript
// Process multiple lectures concurrently
const promises = lectureIds.map(id => processLectureTranscription(id));
await Promise.all(promises);
```

**Batch Error Handling:**
```typescript
// Continue on errors
const results = await Promise.allSettled(
  lectureIds.map(id => processLectureTranscription(id))
);
```

### Storage

- Average transcript: ~2,800 characters (450 words)
- 1,000 lectures: ~2.8 MB (highly compressible)

## Maintenance

### Regular Tasks

**Monitor Transcription Status:**
```sql
SELECT 
  COUNT(*) as total_lectures,
  COUNT(CASE WHEN transcript IS NOT NULL THEN 1 END) as transcribed,
  COUNT(CASE WHEN transcript IS NULL THEN 1 END) as pending
FROM lecture;
```

**Clear Old Transcripts:**
```sql
UPDATE lecture
SET transcript = NULL
WHERE created_at < NOW() - INTERVAL '30 days';
```

**Export Transcripts:**
```sql
SELECT id, file_id, transcript
FROM lecture
WHERE transcript IS NOT NULL
ORDER BY id;
```

## Next Steps

1. **Run Fragment Processing** (if not done)
   - Fragments must exist before transcription
   - See [FRAGMENTS_SYSTEM_GUIDE.md](./FRAGMENTS_SYSTEM_GUIDE.md)

2. **Start Transcription**
   - Test single lecture: `POST /api/transcriptions/lecture/1`
   - Batch process: `node process-transcriptions.mjs neon`

3. **Verify Results**
   - Check transcription status
   - Query transcripts from database
   - Monitor API usage and costs

4. **Integrate with Frontend**
   - Display transcripts in lecture details
   - Add transcript search functionality
   - Show transcription progress

5. **Advanced Features**
   - Fragment-level transcripts (optional)
   - Multilingual support (Arabic + English)
   - Transcript editing/correction UI
   - Full-text search across transcripts

---

**System Status:** ✅ Ready for Production
**Last Updated:** March 28, 2026
**Version:** 1.0.0
