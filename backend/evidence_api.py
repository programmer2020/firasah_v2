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

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

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

if __name__ == "__main__":
    print("Evidence Extraction API Module")
    print("Import this module and call process_lecture_transcript(lecture_id)")
    
    # Handle command line usage
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'extract' and len(sys.argv) > 2:
            lecture_id = int(sys.argv[2])
            result = process_lecture_transcript(lecture_id)
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print("Usage: python evidence_api.py extract <lecture_id>")
