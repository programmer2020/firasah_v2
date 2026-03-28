# Transcription API Quick Reference

## Quick Start

### 1. Transcribe a Single Lecture

```bash
curl -X POST http://localhost:5000/api/transcriptions/lecture/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Lecture transcription completed successfully",
  "data": {
    "lecture_id": 1,
    "file_id": 5,
    "transcript_length": 2847
  }
}
```

---

### 2. Transcribe All Lectures for a File

```bash
curl -X POST http://localhost:5000/api/transcriptions/file/5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "file_id": 5,
    "total_lectures": 3,
    "successful": 3,
    "failed": 0
  }
}
```

---

### 3. Transcribe All Lectures System-Wide

```bash
curl -X POST http://localhost:5000/api/transcriptions/all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "total_processed": 12,
    "successful": 12,
    "failed": 0
  }
}
```

---

### 4. Retrieve Transcription

```bash
curl -X GET http://localhost:5000/api/transcriptions/lecture/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "file_id": 5,
    "transcript": "النص الكامل من الدرس...",
    "language": "ar",
    "filename": "lecture_monday.mp3",
    "start_time": "08:00:00",
    "end_time": "08:45:00"
  }
}
```

---

### 5. Check Transcription Status

```bash
curl -X GET http://localhost:5000/api/transcriptions/status/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "completed",
    "fragment_count": 3,
    "total_duration": "45.00"
  }
}
```

---

### 6. Get Statistics

```bash
curl -X GET http://localhost:5000/api/transcriptions/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "total_lectures": 12,
    "transcribed_lectures": 12,
    "pending_lectures": 0,
    "avg_transcript_length": "2814.33"
  }
}
```

---

### 7. Clear Transcription (Re-transcribe)

```bash
curl -X DELETE http://localhost:5000/api/transcriptions/lecture/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Lecture transcript cleared"
}
```

---

## CLI Commands

### Process All with CLI Tool

```bash
# Against Neon Cloud
node process-transcriptions.mjs neon

# Against Local PostgreSQL
node process-transcriptions.mjs local
```

---

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/transcriptions/lecture/:lectureId` | Transcribe single lecture |
| POST | `/api/transcriptions/file/:fileId` | Transcribe all lectures in file |
| POST | `/api/transcriptions/all` | Transcribe all lectures system-wide |
| GET | `/api/transcriptions/lecture/:lectureId` | Get lecture with transcript |
| GET | `/api/transcriptions/file/:fileId` | Get file's lectures & transcripts |
| GET | `/api/transcriptions/status/:lectureId` | Check transcription status |
| GET | `/api/transcriptions/statistics` | Get system statistics |
| DELETE | `/api/transcriptions/lecture/:lectureId` | Clear transcript for re-transcription |

---

## Error Codes

| Code | Error | Meaning |
|------|-------|---------|
| 200 | Success | Operation completed successfully |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing or invalid token |
| 404 | Not Found | Lecture/file not found |
| 500 | Server Error | Processing failed; check logs |

---

## PowerShell Examples

### Single Lecture

```powershell
$headers = @{
  "Authorization" = "Bearer YOUR_TOKEN"
  "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/transcriptions/lecture/1" `
  -Method POST `
  -Headers $headers
```

### File Transcriptions

```powershell
$headers = @{
  "Authorization" = "Bearer YOUR_TOKEN"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/transcriptions/file/5" `
  -Method POST `
  -Headers $headers
```

### Get Statistics

```powershell
$headers = @{
  "Authorization" = "Bearer YOUR_TOKEN"
}

$stats = Invoke-RestMethod -Uri "http://localhost:5000/api/transcriptions/statistics" `
  -Method GET `
  -Headers $headers

$stats.data | Format-Table -AutoSize
```

---

## TypeScript/Node.js Examples

### Using Fetch API

```typescript
// Transcribe a lecture
const response = await fetch('http://localhost:5000/api/transcriptions/lecture/1', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
console.log(result.data.transcript);
```

### Using Axios

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/transcriptions',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});

// Transcribe
const { data } = await api.post('/lecture/1');

// Get transcript
const { data: lecture } = await api.get('/lecture/1');
console.log(lecture.data.transcript);

// Get stats
const { data: stats } = await api.get('/statistics');
console.log(stats.data);
```

---

## JavaScript Fetch Examples

### Single Lecture Transcription

```javascript
async function transcribeLecture(lectureId, token) {
  const response = await fetch(
    `http://localhost:5000/api/transcriptions/lecture/${lectureId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return await response.json();
}

// Usage
const result = await transcribeLecture(1, 'your_token_here');
console.log(`Successfully transcribed: ${result.data.transcript_length} characters`);
```

### Batch Processing

```javascript
async function transcribeAllLectures(token) {
  const response = await fetch(
    'http://localhost:5000/api/transcriptions/all',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const result = await response.json();
  console.log(`Processed: ${result.data.total_processed}`);
  console.log(`Successful: ${result.data.successful}`);
  console.log(`Failed: ${result.data.failed}`);
  
  return result;
}
```

### Retrieve Transcripts

```javascript
async function getLectureWithTranscript(lectureId, token) {
  const response = await fetch(
    `http://localhost:5000/api/transcriptions/lecture/${lectureId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const result = await response.json();
  return result.data.transcript;
}

// Usage
const transcript = await getLectureWithTranscript(1, 'token');
console.log(transcript); // "النص الكامل من الدرس..."
```

---

## Frontend Integration Example

### React Component

```jsx
import { useState } from 'react';

export function TranscriptionPanel({ lectureId, token }) {
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const transcribeLecture = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/transcriptions/lecture/${lectureId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const result = await response.json();
      
      if (result.success) {
        // Fetch the transcript
        const getResponse = await fetch(
          `http://localhost:5000/api/transcriptions/lecture/${lectureId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        const lectureData = await getResponse.json();
        setTranscript(lectureData.data.transcript);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={transcribeLecture} disabled={loading}>
        {loading ? 'Transcribing...' : 'Transcribe Lecture'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {transcript && (
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc' }}>
          <h3>Transcript:</h3>
          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Database Queries

### Get All Pending Transcriptions

```sql
SELECT id, file_id, time_slot_id
FROM lecture
WHERE transcript IS NULL OR transcript = ''
ORDER BY id;
```

### Get Transcription Statistics

```sql
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN transcript IS NOT NULL THEN 1 END) as transcribed,
  AVG(LENGTH(transcript)) as avg_length,
  MAX(LENGTH(transcript)) as max_length
FROM lecture;
```

### Find Lectures by Duration

```sql
SELECT l.id, l.transcript, 
  LENGTH(l.transcript) as length,
  COUNT(f.id) as fragment_count
FROM lecture l
JOIN fragments f ON l.id = f.lecture_id
WHERE l.transcript IS NOT NULL
GROUP BY l.id
ORDER BY LENGTH(l.transcript) DESC;
```

---

## Troubleshooting

### No Fragments Found

**Problem:** Error "No fragments found for lecture"

**Solution:**
1. Ensure speech fragmentation was run first
2. Check if fragments exist: `SELECT * FROM fragments WHERE lecture_id = ?`
3. Run fragment processing before transcription

---

### API Key Error

**Problem:** "OpenAI API key invalid"

**Solution:**
1. Verify OPENAI_API_KEY in .env is correct
2. Check key has Whisper API access
3. Verify key is not expired

---

### Database Connection Failed

**Problem:** Cannot connect to database

**Solution:**
1. Check NEON_DATABASE_URL or POSTGRES_* env vars
2. Verify database is running
3. Test connection: `psql $DATABASE_URL`

---

### Slow Transcription

**Problem:** Transcription takes too long

**Solution:**
1. Whisper API has ~15-30 second latency per fragment
2. Use batch processing (more efficient)
3. Process parallel when possible
4. Monitor OpenAI API usage

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Fragments per lecture | 3 |
| Time per fragment | 15-30s |
| Time per lecture | 45-90s |
| API timeout | 60s per fragment |
| Batch size | Unlimited |
| Max concurrent | 5 |

---

Created: March 28, 2026
Status: Ready for Production ✅
