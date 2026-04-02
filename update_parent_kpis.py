import psycopg2
import os

# Database configuration
DB_HOST = "ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech"
DB_PORT = 5432
DB_USER = "neondb_owner"
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = "neondb"
DB_SSL = True

# Parent KPIs that need to be updated with combined Detection Signals from their sub-KPIs
parent_kpi_updates = {
    "1.1": "Teacher explicitly announces objective at lesson start (e.g. 'اليوم سنتعلم…', 'هدف درسنا اليوم…'), Objective is repeated or referenced mid-lesson, Objective is written/displayed (inferred if teacher reads aloud from board), Teacher states what success looks like ('ستنجح إذا استطعت…', 'سأعرف أنك فهمت عندما…'), Teacher describes expected output/product standard, Reference to rubric, checklist, or exemplar, Teacher connects task to objective ('هذا النشاط سيساعدنا في…'), Teacher references objective when transitioning between activities, Teacher closes lesson by returning to stated objective",
    
    "1.2": "Concepts build from simple to complex (scaffold evident in transcript), Teacher activates prior knowledge before introducing new content, No unexplained conceptual jumps in the lesson flow, Smooth verbal transitions between phases ('الآن ننتقل إلى…', 'انتهينا من… سنبدأ الآن…'), No extended dead-time periods (long silence or repeated off-topic talk), Teacher adjusts pace explicitly ('سنسرع قليلاً', 'لدينا وقت كافٍ'), Teacher explicitly monitors time ('لدينا 5 دقائق فقط'), Teacher cuts or extends activity based on time, Lesson reaches intended closure vs. running out of time",
    
    "2.1": "Teacher thinks aloud while solving/demonstrating ('أنا الآن أفكر في…', 'لاحظوا كيف أقوم…'), Teacher makes reasoning explicit, not just shows product, Teacher works through an example before students attempt, Teacher and students work through an example together ('لنحل هذا معاً…'), Teacher prompts rather than tells during practice ('ما الخطوة التالية؟'), Teacher provides scaffolded support before releasing to independent work",
    
    "3.2": "Teacher uses affirming language ('ممتاز', 'أحسنتِ', 'فكرة جيدة'), Teacher uses students' names respectfully, No dismissive, sarcastic, or demeaning language toward students, Teacher responds to wrong answers without shame ('شكراً، هذا يذكّرنا بـ… لكن…'), Teacher uses errors to re-teach or probe understanding ('لماذا تظنين هذا؟'), Teacher normalizes mistakes ('الخطأ طبيعي وهو جزء من التعلم')",
    
    "5.1": "Teacher asks open-ended questions requiring reasoning ('لماذا؟', 'كيف توصلتِ؟', 'قارني بين…'), Questions require more than one-word/recall answers, Teacher probes with follow-up ('هل يمكنك التوسع؟', 'ماذا تقصدين بـ…؟'), Teacher uses cold call (not only volunteers) ('من لم يُجب بعد…'), Teacher uses wait time before accepting answers, Teacher uses whole-class CFU ('أشيري إذا وافقت…', 'من تعتقد X ومن تعتقد Y؟'), Teacher conducts explicit comprehension check before moving on"
}

print(f"✓ Updating {len(parent_kpi_updates)} parent KPIs with combined Detection Signals...\n")

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
    
    # Update each parent KPI
    for kpi_code, new_description in parent_kpi_updates.items():
        cur.execute(
            "UPDATE public.kpis SET kpi_description = %s WHERE kpi_code = %s",
            (new_description, kpi_code)
        )
        
        # Get updated KPI info
        cur.execute(
            "SELECT kpi_name FROM public.kpis WHERE kpi_code = %s",
            (kpi_code,)
        )
        kpi_name = cur.fetchone()[0]
        
        print(f"✅ Updated {kpi_code} ({kpi_name})")
        print(f"   Preview: {new_description[:100]}...\n")
    
    conn.commit()
    
    print(f"\n{'='*80}")
    print(f"✅ جميع KPIs الأم تم تحديثها بنجاح!")
    print(f"{'='*80}")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
    if conn:
        conn.rollback()
        conn.close()
    exit(1)
