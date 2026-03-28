# Audio Fragment System Documentation

## Overview

This document describes the audio fragment system implementation for the Firasah AI v2 platform. The system automatically splits audio files into 15-minute fragments and links them with lectures and their corresponding time slots from the class schedule.

## Database Schema

### Fragments Table

The `fragments` table stores metadata for each 15-minute audio segment:

```sql
CREATE TABLE IF NOT EXISTS fragments (
    id SERIAL PRIMARY KEY,
    file_id INTEGER NOT NULL REFERENCES sound_files(file_id) ON DELETE CASCADE,
    lecture_id INTEGER REFERENCES lecture(id) ON DELETE CASCADE,
    time_slot_id INTEGER REFERENCES section_time_slots(time_slot_id) ON DELETE SET NULL,
    fragment_order INTEGER NOT NULL,
    start_seconds DECIMAL(10, 2) NOT NULL,
    end_seconds DECIMAL(10, 2) NOT NULL,
    duration DECIMAL(10, 2) NOT NULL,
    fragment_path VARCHAR(500),
    transcript TEXT COLLATE "C",
    language VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Lecture Table Updates

The `lecture` table has been updated to include:
- `time_slot_id` - Links each lecture to its corresponding section_time_slot
- `slot_order` - Tracks the order of fragments within a lecture

## Architecture

### Fragment Service (`src/services/fragmentService.ts`)

The fragment service provides core functionality:

#### Key Functions:

1. **`splitAudioIntoFragments(filePath, outputDir)`**
   - Splits an audio file into 15-minute chunks using FFmpeg
   - Returns array of fragment metadata with timing information
   - Stores fragment files in `./uploads/fragments`

2. **`createFragmentRecords(fileId, lectureId, timeSlotId, fragments)`**
   - Creates database records for each fragment
   - Links fragments to lectures and time slots
   - Returns array of created fragment records

3. **`processLectureFragments(fileId, filePath, lectureId, timeSlotId)`**
   - Main orchestration function
   - Splits audio and creates database records in one call
   - Handles error logging and state management

4. **`getFragmentsByLectureId(lectureId)`**
   - Retrieves all fragments for a specific lecture
   - Includes time slot information

5. **`getFragmentsByFileId(fileId)`**
   - Retrieves all fragments for a sound file
   - Ordered by fragment sequence

6. **`getFragmentsByTimeSlot(timeSlotId)`**
   - Retrieves fragments for a specific time slot
   - Useful for analyzing specific class periods

7. **`getFragmentStatistics(fileId)`**
   - Returns comprehensive statistics:
     - Total fragment count
     - Total duration
     - Average fragment duration
     - First and last fragment boundaries

### Fragment Routes (`src/routes/fragmentRoutes.ts`)

REST API endpoints for fragment management:

#### GET Endpoints:

- **`GET /api/fragments/file/:fileId`**
  - Retrieve all fragments for a sound file
  - Authentication required

- **`GET /api/fragments/lecture/:lectureId`**
  - Retrieve all fragments for a lecture
  - Includes lecture transcript
  - Authentication required

- **`GET /api/fragments/timeslot/:timeSlotId`**
  - Retrieve all fragments for a time slot
  - Includes time slot schedule information
  - Authentication required

- **`GET /api/fragments/stats/:fileId`**
  - Get fragment statistics for a file
  - Returns counts, durations, and boundaries
  - Authentication required

#### POST Endpoints:

- **`POST /api/fragments/process/:fileId`**
  - Process a single sound file into fragments
  - Query parameters:
    - `lectureId` (optional) - Link to specific lecture
    - `timeSlotId` (optional) - Link to specific time slot
  - Returns created fragment records
  - Authentication required

- **`POST /api/fragments/process-all`**
  - Bulk process all sound files
  - Automatically links fragments to associated lectures
  - Returns summary statistics
  - **Warning:** This is a resource-intensive operation
  - Authentication required

#### DELETE Endpoints:

- **`DELETE /api/fragments/file/:fileId`**
  - Delete all fragments for a file
  - Returns count of deleted fragments
  - Authentication required

## Data Relationships

### Fragment Linking Structure

```
Sound Files (sound_files)
    ↓
    Lectures (lecture) - One file can have multiple lectures
    ↓
    Fragments (fragments) - Each lecture has multiple 15-min fragments
    ↓
    Time Slots (section_time_slots) - Each fragment belongs to a time slot
```

### Example Scenario:

For a 45-minute class: - File: `classroom_recording.mp3` (45 minutes)
- Lecture: Links to class_id = 5, time_slot_id = 10
- Time Slot: Sunday 9:00 AM - 10:00 AM (section_time_slots.time_slot_id = 10)
- Fragments:
  - Fragment 0: 0-15 min (time_slot_id = 10, lecture_id = 45)
  - Fragment 1: 15-30 min (time_slot_id = 10, lecture_id = 45)
  - Fragment 2: 30-45 min (time_slot_id = 10, lecture_id = 45)

## Processing Workflow

### Manual Fragment Processing

```bash
# Process a specific file
POST /api/fragments/process/1?lectureId=5&timeSlotId=10

# Response:
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
    ...
  ]
}
```

### Bulk Fragment Processing

```bash
# Process all files in database
POST /api/fragments/process-all

# Response:
{
  "success": true,
  "message": "✅ Processed 15 files, 0 errors",
  "results": [
    {
      "file_id": 1,
      "lecture_id": 5,
      "status": "success",
      "fragments_created": 3
    },
    ...
  ],
  "summary": {
    "total_files": 15,
    "successful": 15,
    "errors": 0
  }
}
```

### Command-Line Utility

```bash
# Process fragments using Node.js utility
cd backend
node process-fragments.mjs

# or specify database
node process-fragments.mjs neon  # Use Neon Cloud
node process-fragments.mjs local # Use Local PostgreSQL
```

Output:
```
╔════════════════════════════════════════╗
║  AUDIO FRAGMENT PROCESSING UTILITY     ║
║  Splits audio files into 15-min chunks║
╚════════════════════════════════════════╝

📍 Using database: NEON
🗄️  Host: ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech

✅ Connected to database

📥 Fetching sound files from database...
✅ Found 10 sound files

📄 Processing file 1: classroom_recording.mp3
   📝 Found 1 lectures for this file
   🔄 Creating fragments for lecture 1...
      ✅ Fragment 0 created: id=1
      ✅ Fragment 1 created: id=2
      ✅ Fragment 2 created: id=3

...

═══════════════════════════════════════════════════════════════
📊 Fragment Processing Summary
═══════════════════════════════════════════════════════════════
✅ Successfully processed: 10 files
⏭️  Skipped (already fragmented): 0 files
❌ Errors: 0 files
📦 Total files: 10
═══════════════════════════════════════════════════════════════
```

## Migration

The fragment system is initialized through migration:

```bash
# Location: backend/migrations/create-fragments-table.ts
# Automatically run on database initialization
```

The migration:
1. Creates the `fragments` table with indexes
2. Adds `time_slot_id` column to `lecture` table if not present
3. Creates necessary foreign key constraints
4. Sets up efficient indexes for query performance

## Implementation Details

### Fragment Duration

- **Standard Fragment Length:** 15 minutes (900 seconds)
- **Total Lecture Duration:** 45 minutes (3 fragments)
- **Fragment Order:** Starts at 0, sequential numbering

### Indexing

Efficient indexes are created for:
- `idx_fragments_file_id` - Quick lookup by file
- `idx_fragments_lecture_id` - Quick lookup by lecture
- `idx_fragments_time_slot_id` - Quick lookup by time slot
- `idx_fragments_order` - Composite index for ordered queries

### Storage

Fragment audio files are stored at:
```
./uploads/fragments/
├── 1_fragment_0.mp3
├── 1_fragment_1.mp3
├── 1_fragment_2.mp3
├── 2_lecture_5_fragment_0.mp3
├── 2_lecture_5_fragment_1.mp3
└── ...
```

## Error Handling

The system includes comprehensive error handling:

- Non-existent file detection
- Database constraint validation
- Audio processing failures
- Missing lecture associations
- Transaction rollback on errors

## Example Usage in Frontend

### Get All Fragments for a Lecture

```javascript
// Get fragments for lecture 5
const response = await fetch('/api/fragments/lecture/5', {
  headers: {
    'Authorization': `Bearer ${authToken}`
  }
});

const { success, data, count } = await response.json();
// data = Array of fragments with full metadata
```

### Process a File into Fragments

```javascript
// Process file 3 with specific lecture and time slot
const response = await fetch('/api/fragments/process/3?lectureId=5&timeSlotId=10', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
// result.data = Array of created fragments
```

### Get Fragment Statistics

```javascript
// Get statistics for file 3
const response = await fetch('/api/fragments/stats/3', {
  headers: {
    'Authorization': `Bearer ${authToken}`
  }
});

const stats = await response.json();
// stats.data = {
//   total_fragments: 3,
//   total_files: 1,
//   total_lectures: 1,
//   total_time_slots: 1,
//   avg_fragment_duration: "900.00",
//   total_duration: 2700
// }
```

## Performance Considerations

1. **FFmpeg Processing:** Audio splitting is CPU-intensive
   - Process files asynchronously
   - Consider batch processing during off-peak hours

2. **Database Queries:** Fragment lookups are optimized with indexes
   - Lecture-based queries: O(log n) on `idx_fragments_lecture_id`
   - Time-based queries: O(log n) on `idx_fragments_time_slot_id`

3. **Storage:** Fragment files consume storage space
   - Original file: 100 MB → 3 Fragment files (~100 MB total)
   - Plan for adequate disk space

## Maintenance

### Clean Up Orphaned Fragments

```bash
# Delete fragments for deleted files
DELETE FROM fragments 
WHERE file_id NOT IN (SELECT file_id FROM sound_files);
```

### Reprocess Fragments

```bash
# Delete existing fragments
DELETE FROM fragments WHERE file_id = 3;

# Reprocess the file
POST /api/fragments/process/3
```

## Troubleshooting

### Issue: Fragments not created
- Check FFmpeg installation
- Verify file path exists
- Check database connectivity
- Review server logs for detailed errors

### Issue: Fragment files not found
- Verify storage directory permissions
- Check available disk space
- Confirm fragment_path in database matches actual files

### Issue: Query timeouts
- Check database indexes are created
- Monitor database performance
- Consider archiving old fragments

## Future Enhancements

1. **Incremental Processing:** Only process new files
2. **Parallel Processing:** Process multiple files simultaneously
3. **Fragment Transcription:** Auto-transcribe each fragment
4. **Compression:** Store fragments in compressed format
5. **Streaming:** Stream fragments directly without file storage
6. **Quality Analysis:** Analyze audio quality per fragment
7. **Real-time Fragmentation:** Process during recording

## References

- Fragment Service: `src/services/fragmentService.ts`
- Fragment Routes: `src/routes/fragmentRoutes.ts`
- Fragment Migration: `migrations/create-fragments-table.ts`
- Fragment Processor: `process-fragments.mjs`
- Database Schema: `database/create_fragments_table.sql`
