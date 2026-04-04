#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API for Evidence Extraction from Lecture Transcripts
Extracts evidence from transcripts based on KPI Detection Signals
"""

import psycopg2
import json
import re
import sys
import os
from typing import List, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Initialize FastAPI app
app = FastAPI(
    title="Firasah Evidence API",
    description="API for Evidence Extraction from Lecture Transcripts",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str | None = None

# Database configuration
DB_HOST = "ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech"
DB_PORT = 5432
DB_USER = "neondb_owner"
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = "neondb"
DB_SSL = True

# Load KPI signals
KPI_SIGNALS = {}
try:
    with open('../kpi_detection_signals.json', 'r', encoding='utf-8') as f:
        KPI_SIGNALS = json.load(f)
except:
    try:
        with open('kpi_detection_signals.json', 'r', encoding='utf-8') as f:
            KPI_SIGNALS = json.load(f)
    except:
        print("⚠ Warning: KPI signals file not found")

def get_db_connection():
    """Create database connection"""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        sslmode='require' if DB_SSL else 'disable'
    )

def extract_evidence_for_kpi(transcript: str, kpi_code: str, kpi_name: str, signals: str) -> List[Dict]:
    """
    Extract evidence for a specific KPI from transcript
    Uses keyword matching as first pass
    """
    
    if not transcript or len(transcript.strip()) < 20:
        return []
    
    evidence_list = []
    
    # Extract key phrases from signals
    # Split by comma
    signal_items = re.split(r',\s*', signals)
    signal_items = [item.strip() for item in signal_items if item.strip() and len(item.strip()) > 5]
    
    # Convert to lowercase for matching
    transcript_lower = transcript.lower()
    
    # Look for signal phrases
    for idx, signal in enumerate(signal_items):
        # Try full phrase first
        signal_search = signal.lower()
        
        # Remove parentheses and quotes for better matching
        signal_search_clean = re.sub(r'[\'"\(\)]', '', signal_search)
        
        # Find all occurrences
        start = 0
        found_count = 0
        while found_count < 2:  # Limit to first 2 matches per signal
            pos = transcript_lower.find(signal_search_clean, start)
            if pos == -1:
                break
            
            # Extract context window (100 chars before and after)
            context_start = max(0, pos - 100)
            context_end = min(len(transcript), pos + len(signal_search_clean) + 100)
            context = transcript[context_start:context_end].strip()
            
            # Skip if context is too short
            if len(context) < 30:
                start = pos + 1
                continue
            
            # Calculate confidence based on signal length
            confidence = min(90, 50 + (len(signal_search_clean) / max(len(signal_search_clean), 30)) * 40)
            
            evidence_list.append({
                'text': context,
                'interpretation': f"Demonstrates: {signal[:100]}",
                'confidence': int(confidence),
                'signal_matched': signal
            })
            
            found_count += 1
            start = pos + 1
    
    return evidence_list

def save_evidence_to_db(lecture_id: int, evidence_data: List[Dict]) -> Dict:
    """Save extracted evidence to database"""
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        saved_count = 0
        failed_count = 0
        
        for evidence in evidence_data:
            try:
                # Check if similar evidence already exists
                cur.execute("""
                    SELECT evidence_id FROM public.evidence 
                    WHERE lecture_id = %s AND kpi_id = %s 
                    AND facts LIKE %s LIMIT 1
                """, (lecture_id, evidence['kpi_id'], evidence['facts'][:50] + '%'))
                
                if cur.fetchone():
                    continue  # Skip duplicates
                
                # Insert new evidence
                cur.execute("""
                    INSERT INTO public.evidence 
                    (lecture_id, kpi_id, facts, interpretation, confidence, iscalculated, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                """, (
                    lecture_id,
                    evidence['kpi_id'],
                    evidence['text'][:500],  # Limit text length
                    evidence['interpretation'][:500],
                    evidence['confidence'],
                    True,
                    'extracted'
                ))
                
                saved_count += 1
            
            except Exception as e:
                print(f"Error saving evidence: {e}")
                failed_count += 1
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'saved': saved_count,
            'failed': failed_count,
            'status': 'success'
        }
    
    except Exception as e:
        print(f"Database error: {e}")
        return {
            'saved': 0,
            'failed': len(evidence_data),
            'status': 'error',
            'error': str(e)
        }

def process_lecture_transcript(lecture_id: int) -> Dict:
    """
    Main function to process a lecture transcript
    1. Fetch transcript from database
    2. Extract evidence for all KPIs
    3. Save to database
    """
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get lecture transcript
        cur.execute("""
            SELECT lecture_id, transcript FROM public.lecture 
            WHERE lecture_id = %s
        """, (lecture_id,))
        
        result = cur.fetchone()
        
        if not result:
            return {'error': f'Lecture {lecture_id} not found'}
        
        lecture_id, transcript = result
        
        if not transcript:
            cur.close()
            conn.close()
            return {'error': f'No transcript found for lecture {lecture_id}'}
        
        print(f"📖 Processing lecture {lecture_id}")
        print(f"   Transcript length: {len(transcript)} characters")
        
        all_evidence = []
        
        # Process each KPI
        for kpi_code, signals_text in KPI_SIGNALS.items():
            # Get KPI info
            cur.execute("""
                SELECT kpi_id, kpi_name FROM public.kpis 
                WHERE kpi_code = %s
            """, (kpi_code,))
            
            kpi_result = cur.fetchone()
            if not kpi_result:
                continue
            
            kpi_id, kpi_name = kpi_result
            
            # Extract evidence
            evidence = extract_evidence_for_kpi(
                transcript, kpi_code, kpi_name, signals_text
            )
            
            # Add KPI info
            for ev in evidence:
                ev['kpi_id'] = kpi_id
                ev['kpi_code'] = kpi_code
                ev['lecture_id'] = lecture_id
                all_evidence.append(ev)
        
        cur.close()
        conn.close()
        
        print(f"   Found {len(all_evidence)} evidence items")
        
        # Save to database
        if all_evidence:
            save_result = save_evidence_to_db(lecture_id, all_evidence)
            return {
                'lecture_id': lecture_id,
                'evidence_found': len(all_evidence),
                'saved': save_result['saved'],
                'failed': save_result['failed'],
                'status': 'completed'
            }
        else:
            return {
                'lecture_id': lecture_id,
                'evidence_found': 0,
                'status': 'completed'
            }
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return {'error': str(e)}

# ============ API Endpoints ============

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - API is running"""
    return {"message": "Firasah Evidence API is running", "status": "ok"}

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        conn.close()
        return {"status": "healthy", "message": "API and Database are connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

# Authentication Endpoints
@app.post("/api/auth/login", tags=["Auth"])
async def login(request: LoginRequest):
    """Login endpoint"""
    try:
        if request.email and request.password:
            return {
                "status": "success",
                "data": {
                    "user": {
                        "id": 1,
                        "email": request.email,
                        "name": "User"
                    },
                    "token": f"token_{request.email}"
                }
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid credentials")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/register", tags=["Auth"])
async def register(request: RegisterRequest):
    """Register endpoint"""
    try:
        if request.email and request.password:
            return {
                "status": "success",
                "data": {
                    "user": {
                        "id": 1,
                        "email": request.email,
                        "name": request.name or "User"
                    },
                    "token": f"token_{request.email}"
                }
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid data")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/auth/profile", tags=["Auth"])
async def get_profile():
    """Get user profile"""
    return {
        "status": "success",
        "data": {
            "user": {
                "id": 1,
                "email": "user@example.com",
                "name": "User"
            }
        }
    }

@app.get("/api/kpis", tags=["KPIs"])
async def get_kpis():
    """Get all available KPIs"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT kpi_id, kpi_code, kpi_name FROM public.kpis ORDER BY kpi_code")
        kpis = cur.fetchall()
        cur.close()
        conn.close()
        return {
            "data": [{"kpi_id": k[0], "kpi_code": k[1], "kpi_name": k[2]} for k in kpis],
            "count": len(kpis)
        }
    except Exception as e:
        # Fallback with 8 sample KPIs
        return {
            "data": [
                {"kpi_id": 1, "kpi_code": "K1", "kpi_name": "Clarity"},
                {"kpi_id": 2, "kpi_code": "K2", "kpi_name": "Engagement"},
                {"kpi_id": 3, "kpi_code": "K3", "kpi_name": "Pacing"},
                {"kpi_id": 4, "kpi_code": "K4", "kpi_name": "Assessment"},
                {"kpi_id": 5, "kpi_code": "K5", "kpi_name": "Organization"},
                {"kpi_id": 6, "kpi_code": "K6", "kpi_name": "Communication"},
                {"kpi_id": 7, "kpi_code": "K7", "kpi_name": "Feedback"},
                {"kpi_id": 8, "kpi_code": "K8", "kpi_name": "Participation"},
            ],
            "count": 8
        }

@app.get("/api/subjects", tags=["Subjects"])
async def get_subjects():
    """Get all subjects"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT subject_id, subject_name FROM public.subjects ORDER BY subject_name")
        subjects = cur.fetchall()
        cur.close()
        conn.close()
        if subjects:
            return {
                "data": [{"subject_id": s[0], "subject_name": s[1]} for s in subjects],
            }
        else:
            # Return fallback data
            return {
                "data": [
                    {"subject_id": 1, "subject_name": "Math"},
                    {"subject_id": 2, "subject_name": "Science"},
                    {"subject_id": 3, "subject_name": "English"},
                    {"subject_id": 4, "subject_name": "History"},
                    {"subject_id": 5, "subject_name": "Arabic"},
                    {"subject_id": 6, "subject_name": "Geography"},
                    {"subject_id": 7, "subject_name": "Social Studies"},
                    {"subject_id": 8, "subject_name": "Physical Education"},
                ]
            }
    except:
        # Return fallback data on error
        return {
            "data": [
                {"subject_id": 1, "subject_name": "Math"},
                {"subject_id": 2, "subject_name": "Science"},
                {"subject_id": 3, "subject_name": "English"},
                {"subject_id": 4, "subject_name": "History"},
                {"subject_id": 5, "subject_name": "Arabic"},
                {"subject_id": 6, "subject_name": "Geography"},
                {"subject_id": 7, "subject_name": "Social Studies"},
                {"subject_id": 8, "subject_name": "Physical Education"},
            ]
        }

@app.get("/api/sections", tags=["Sections"])
async def get_sections():
    """Get all sections"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT section_id, section_name FROM public.sections ORDER BY section_name")
        sections = cur.fetchall()
        cur.close()
        conn.close()
        return {
            "data": [{"section_id": s[0], "section_name": s[1]} for s in sections],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/api/lectures", tags=["Statistics"])
async def get_lectures(startDate: str = None, endDate: str = None):
    """Get lectures statistics for date range"""
    try:
        # Return mock data for now
        return {
            "count": 5,
            "data": [
                {"id": 1, "name": "Lecture 1", "date": "2024-04-01"},
                {"id": 2, "name": "Lecture 2", "date": "2024-04-02"},
                {"id": 3, "name": "Lecture 3", "date": "2024-04-03"},
                {"id": 4, "name": "Lecture 4", "date": "2024-04-04"},
                {"id": 5, "name": "Lecture 5", "date": "2024-04-05"},
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/api/teachers", tags=["Statistics"])
async def get_teachers():
    """Get teachers statistics"""
    try:
        # Return mock data
        return {
            "count": 452,
            "data": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/api/uploads", tags=["Statistics"])
async def get_uploads():
    """Get upload hours statistics"""
    try:
        # Return mock data
        return {
            "count": 8920,
            "data": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/api/users", tags=["Statistics"])
async def get_users():
    """Get user sessions statistics"""
    try:
        # Return mock data
        return {
            "count": 12500,
            "data": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/api/kpis/domains/all", tags=["KPIs"])
async def get_kpi_domains_all():
    """Get all KPI domains"""
    try:
        # Return mock data with proper field names - Arabic names from database
        data = {
            "data": [
                {"domain_code": "D1", "domain_name": "إعداد وتنفيذ خطة التعلم", "domain_description": "Planning and executing learning strategies"},
                {"domain_code": "D2", "domain_name": "تنوع استراتيجيات التدريس", "domain_description": "Diverse teaching strategies"},
                {"domain_code": "D3", "domain_name": "تهيئة البيئة التعليمية", "domain_description": "Learning environment setup"},
                {"domain_code": "D4", "domain_name": "الإدارة الصفية", "domain_description": "Classroom management"},
                {"domain_code": "D5", "domain_name": "تنوع أساليب التقويم", "domain_description": "Assessment methods diversity"},
                {"domain_code": "D6", "domain_name": "تحليل مشاركات الطلاب", "domain_description": "Student participation analysis"},
                {"domain_code": "D7", "domain_name": "توظيف التقنيات", "domain_description": "Technology integration"},
                {"domain_code": "D8", "domain_name": "تحسين نتائج المتعلمين", "domain_description": "Student outcome improvement"},
            ]
        }
        return JSONResponse(content=data, media_type="application/json; charset=utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/api/teachers/logins/stats", tags=["Statistics"])
async def get_teacher_login_stats(startDate: str = None, endDate: str = None):
    """Get teacher login statistics for date range"""
    try:
        return {
            "count": 452,
            "data": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/api/sound-files/upload-hours/stats", tags=["Statistics"])
async def get_upload_hours_stats(startDate: str = None, endDate: str = None):
    """Get upload hours statistics for date range"""
    try:
        return {
            "count": 8920,
            "data": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/api/auth/logins/stats", tags=["Statistics"])
async def get_auth_login_stats(startDate: str = None, endDate: str = None):
    """Get user login statistics for date range"""
    try:
        return {
            "count": 12500,
            "data": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
