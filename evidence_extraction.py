import psycopg2
import json
import re
import os
from openai import OpenAI

# Database configuration
DB_HOST = "ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech"
DB_PORT = 5432
DB_USER = "neondb_owner"
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = "neondb"
DB_SSL = True

# OpenAI API
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

# Load KPI detection signals
with open('kpi_detection_signals.json', 'r', encoding='utf-8') as f:
    kpi_signals = json.load(f)

def extract_keywords_from_signals(kpi_code, signals_text):
    """Extract key phrases and keywords from detection signals"""
    # Split by comma or numbered list
    items = re.split(r',(?=\s*[A-Z])|(\d+\.\s+)', signals_text)
    items = [item.strip() for item in items if item and item.strip()]
    
    keywords = []
    for item in items:
        # Extract important words (verbs, nouns, key concepts)
        words = item.split()
        for word in words:
            if len(word) > 4 and word.lower() not in ['teacher', 'student', 'students', 'lesson', 'class']:
                keywords.append(word.lower())
    
    return keywords[:10]  # Top 10 terms

def keyword_matching(transcript, kpi_code, signals_text):
    """Simple keyword matching to find evidence"""
    keywords = extract_keywords_from_signals(kpi_code, signals_text)
    
    evidence_found = []
    transcript_lower = transcript.lower()
    
    for keyword in keywords:
        if keyword in transcript_lower:
            # Find context (50 chars before and after)
            idx = transcript_lower.find(keyword)
            start = max(0, idx - 50)
            end = min(len(transcript), idx + len(keyword) + 50)
            context = transcript[start:end].strip()
            evidence_found.append({
                'score': 0.6,
                'text': context,
                'keyword': keyword
            })
    
    return evidence_found

def ai_analyze_evidence(lecture_id, transcript, kpi_code, kpi_name, signals_text):
    """Use OpenAI to intelligently extract evidence for a KPI"""
    
    try:
        # Chunk transcript into smaller parts if too long
        max_chars = 3000
        chunks = [transcript[i:i+max_chars] for i in range(0, len(transcript), max_chars)]
        
        all_evidence = []
        
        for chunk in chunks:
            prompt = f"""Analyze the following lecture transcript and extract evidence that demonstrates the KPI: "{kpi_code} - {kpi_name}"

Detection Signals (what to look for):
{signals_text}

Transcript:
{chunk}

Based on the Detection Signals, find specific quotes or descriptions from the transcript that show evidence of this KPI being implemented. 
For each piece of evidence found, provide:
1. The exact quote or paraphrase from the transcript
2. A brief interpretation of why this demonstrates the KPI
3. A confidence score (0-100)

Format your response as JSON array with objects having: "text", "interpretation", "confidence"

If no clear evidence found for this KPI in this chunk, return an empty array []."""

            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert education evaluator analyzing lecture transcripts based on specific teaching indicators."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1000
            )
            
            try:
                # Parse JSON from response
                response_text = response.choices[0].message.content
                # Try to extract JSON from response
                json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
                if json_match:
                    evidence_list = json.loads(json_match.group())
                    all_evidence.extend(evidence_list)
            except json.JSONDecodeError:
                pass
        
        return all_evidence
    
    except Exception as e:
        print(f"⚠ AI analysis error for {kpi_code}: {e}")
        return []

def process_transcript_for_kpis(lecture_id, transcript):
    """Process a transcript for all KPIs and extract evidence"""
    
    if not transcript or len(transcript.strip()) < 50:
        print(f"⚠ Transcript too short for lecture {lecture_id}")
        return []
    
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            sslmode='require' if DB_SSL else 'disable'
        )
        cur = conn.cursor()
        
        extracted_evidence = []
        
        # Process for each KPI
        for kpi_code, signals_text in kpi_signals.items():
            # Get KPI info
            cur.execute(
                "SELECT kpi_id, kpi_name FROM public.kpis WHERE kpi_code = %s",
                (kpi_code,)
            )
            result = cur.fetchone()
            
            if not result:
                continue
            
            kpi_id, kpi_name = result
            
            print(f"\n📊 Processing KPI {kpi_code} ({kpi_name})...")
            
            # Try keyword matching first (faster)
            keyword_evidence = keyword_matching(transcript, kpi_code, signals_text)
            
            # Use AI for deeper analysis
            ai_evidence = ai_analyze_evidence(lecture_id, transcript, kpi_code, kpi_name, signals_text)
            
            # Combine results
            for evidence_item in keyword_evidence + ai_evidence:
                extracted_evidence.append({
                    'kpi_id': kpi_id,
                    'kpi_code': kpi_code,
                    'lecture_id': lecture_id,
                    'facts': evidence_item.get('text', ''),
                    'interpretation': evidence_item.get('interpretation', ''),
                    'confidence': int(evidence_item.get('confidence', 50))
                })
            
            if keyword_evidence or ai_evidence:
                print(f"  ✓ Found {len(keyword_evidence) + len(ai_evidence)} evidence items")
        
        cur.close()
        conn.close()
        
        return extracted_evidence
    
    except Exception as e:
        print(f"❌ Error processing transcript: {e}")
        return []

if __name__ == "__main__":
    # Test with a sample lecture
    print("🔍 Evidence Extraction System\n")
    print("This module will:")
    print("1. Fetch lecture transcripts")
    print("2. Analyze them using Detection Signals")
    print("3. Extract evidence for each KPI")
    print("4. Save evidence to database")
