"""
Test the Evidence Extraction System
استبار نظام استخراج Evidence
"""

import psycopg2
import json
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from evidence_api import (
    extract_evidence_for_kpi,
    process_lecture_transcript,
    get_db_connection
)

def test_with_sample_transcript():
    """Test extraction with a sample Arabic transcript"""
    
    sample_transcript = """
    السلام عليكم ورحمة الله وبركاته. اليوم سنتعلم عن الكسور العادية. 
    هدفنا اليوم هو فهم كيفية جمع الكسور البسيطة. سأعرف أنك فهمت عندما 
    تستطيع حل مسائل الجمع بنفسك.
    
    الآن، سأشرح لكم الطريقة. لاحظوا كيف أفكر:
    1. أولاً، نجد مقام مشترك
    2. ثم، نجمع البسط
    3. أخيراً، نبسط الكسر
    
    انظروا هذا المثال: 1/2 + 1/4
    أنا الآن أفكر: الـ LCD هو 4
    فـ 1/2 = 2/4
    إذاً 2/4 + 1/4 = 3/4
    
    الآن، لنفعل هذا معاً. من يستطيع أن يخبرني الخطوة الأولى؟
    نعم، نحتاج لـ LCD. أحسنتِ! فكرة جيدة جداً.
    
    من حل المسألة بشكل صحيح، ممتاز! هذا يدل على أنك فهمت الدرس.
    من أخطأ، لا تقلقي. الخطأ طبيعي وهو جزء من التعلم.
    """
    
    print("=" * 80)
    print("🧪 اختبار نظام استخراج Evidence")
    print("=" * 80)
    print(f"\nطول النص: {len(sample_transcript)} حرف")
    print(f"\nنموذج من النص:")
    print(sample_transcript[:200] + "...\n")
    
    # Test with a few KPIs
    test_kpis = {
        "1.1a": "Teacher explicitly announces objective at lesson start (e.g. 'اليوم سنتعلم…', 'هدف درسنا اليوم…'), Objective is repeated or referenced mid-lesson",
        "1.1b": "Teacher states what success looks like ('ستنجح إذا استطعت…', 'سأعرف أنك فهمت عندما…')",
        "2.1a": "Teacher thinks aloud while solving/demonstrating ('أنا الآن أفكر في…', 'لاحظوا كيف أقوم…')",
        "2.1b": "Teacher and students work through an example together ('لنحل هذا معاً…'), Teacher prompts rather than tells",
        "3.2a": "Teacher uses affirming language ('ممتاز', 'أحسنتِ', 'فكرة جيدة')",
        "3.2b": "Teacher normalizes mistakes ('الخطأ طبيعي وهو جزء من التعلم')",
    }
    
    print("🔍 استخراج Evidence لكل KPI:\n")
    
    all_evidence = []
    
    for kpi_code, signals in test_kpis.items():
        evidence = extract_evidence_for_kpi(
            sample_transcript, 
            kpi_code, 
            f"KPI {kpi_code}", 
            signals
        )
        
        print(f"📌 {kpi_code}:")
        if evidence:
            print(f"   ✓ وجدنا {len(evidence)} من Evidence\n")
            for i, ev in enumerate(evidence[:2], 1):  # Show first 2
                print(f"   Evidence #{i}:")
                print(f"   النص: \"{ev['text'][:80]}...\"")
                print(f"   درجة الثقة: {ev['confidence']}%")
                print()
            all_evidence.extend(evidence)
        else:
            print(f"   ✗ لم نجد Evidence\n")
    
    print("=" * 80)
    print(f"✅ الإجمالي: وجدنا {len(all_evidence)} Evidence")
    print("=" * 80)
    
    return all_evidence

def test_database_integration():
    """Test integration with actual database"""
    
    print("\n" + "=" * 80)
    print("💾 اختبار قاعدة البيانات")
    print("=" * 80)
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get a lecture with transcript
        cur.execute("""
            SELECT lecture_id, SUBSTRING(transcript FROM 1 FOR 200) as preview
            FROM public.lecture
            WHERE transcript IS NOT NULL AND LENGTH(transcript) > 100
            LIMIT 1
        """)
        
        result = cur.fetchone()
        
        if result:
            lecture_id, preview = result
            print(f"\n✓ وجدنا محاضرة بـ ID: {lecture_id}")
            print(f"  نص الملخص: {preview}...")
            print(f"\n  يمكنك تشغيل استخراج Evidence من خلال:")
            print(f"  python evidence_api.py extract {lecture_id}")
        else:
            print("\n⚠ لم نجد محاضرات بها transcripts")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ خطأ في قاعدة البيانات: {e}")

if __name__ == "__main__":
    # Run tests
    test_with_sample_transcript()
    test_database_integration()
    
    print("\n" + "=" * 80)
    print("✅ انتهى الاختبار")
    print("=" * 80)
    print("\n📚 للمزيد من المعلومات، انظر: EVIDENCE_EXTRACTION_GUIDE.md")
