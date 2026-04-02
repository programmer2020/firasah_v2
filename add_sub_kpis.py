import json
import psycopg2

# Database configuration from backend/.env
DB_HOST = "ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech"
DB_PORT = 5432
DB_USER = "neondb_owner"
DB_PASSWORD = "npg_o4iEtH5mkKIz"
DB_NAME = "neondb"
DB_SSL = True

# New sub-KPIs to add
new_kpis = [
    {
        "kpi_code": "1.1a",
        "kpi_name": "إعلان هدف الدرس للطلاب",
        "kpi_description": "Teacher explicitly announces objective at lesson start (e.g. 'اليوم سنتعلم…', 'هدف درسنا اليوم…'), Objective is repeated or referenced mid-lesson, Objective is written/displayed (inferred if teacher reads aloud from board)"
    },
    {
        "kpi_code": "1.1b",
        "kpi_name": "توصيل معيار النجاح للطلاب",
        "kpi_description": "Teacher states what success looks like ('ستنجح إذا استطعت…', 'سأعرف أنك فهمت عندما…'), Teacher describes expected output/product standard, Reference to rubric, checklist, or exemplar"
    },
    {
        "kpi_code": "1.1c",
        "kpi_name": "ربط الأنشطة والمهام بهدف الدرس",
        "kpi_description": "Teacher connects task to objective ('هذا النشاط سيساعدنا في…'), Teacher references objective when transitioning between activities, Teacher closes lesson by returning to stated objective"
    },
    {
        "kpi_code": "1.2a",
        "kpi_name": "التسلسل المنطقي لمحتوى الدرس",
        "kpi_description": "Concepts build from simple to complex (scaffold evident in transcript), Teacher activates prior knowledge before introducing new content, No unexplained conceptual jumps in the lesson flow"
    },
    {
        "kpi_code": "1.2b",
        "kpi_name": "إيقاع الحصة والانتقال بين مراحلها",
        "kpi_description": "Smooth verbal transitions between phases ('الآن ننتقل إلى…', 'انتهينا من… سنبدأ الآن…'), No extended dead-time periods (long silence or repeated off-topic talk), Teacher adjusts pace explicitly ('سنسرع قليلاً', 'لدينا وقت كافٍ')"
    },
    {
        "kpi_code": "1.2c",
        "kpi_name": "إدارة وقت الحصة",
        "kpi_description": "Teacher explicitly monitors time ('لدينا 5 دقائق فقط'), Teacher cuts or extends activity based on time, Lesson reaches intended closure vs. running out of time"
    },
    {
        "kpi_code": "2.1a",
        "kpi_name": "النمذجة (أنا أفعل – I Do)",
        "kpi_description": "Teacher thinks aloud while solving/demonstrating ('أنا الآن أفكر في…', 'لاحظوا كيف أقوم…'), Teacher makes reasoning explicit, not just shows product, Teacher works through an example before students attempt"
    },
    {
        "kpi_code": "2.1b",
        "kpi_name": "الممارسة الموجهة (نفعل معاً – We Do)",
        "kpi_description": "Teacher and students work through an example together ('لنحل هذا معاً…'), Teacher prompts rather than tells during practice ('ما الخطوة التالية؟'), Teacher provides scaffolded support before releasing to independent work"
    },
    {
        "kpi_code": "3.2a",
        "kpi_name": "لغة الاحترام والتشجيع في التعامل مع الطلاب",
        "kpi_description": "Teacher uses affirming language ('ممتاز', 'أحسنتِ', 'فكرة جيدة'), Teacher uses students' names respectfully, No dismissive, sarcastic, or demeaning language toward students"
    },
    {
        "kpi_code": "3.2b",
        "kpi_name": "أمان الخطأ: توظيف الإجابات الخاطئة كفرص تعليمية",
        "kpi_description": "Teacher responds to wrong answers without shame ('شكراً، هذا يذكّرنا بـ… لكن…'), Teacher uses errors to re-teach or probe understanding ('لماذا تظنين هذا؟'), Teacher normalizes mistakes ('الخطأ طبيعي وهو جزء من التعلم')"
    },
    {
        "kpi_code": "5.1a",
        "kpi_name": "جودة الأسئلة المطروحة (المستوى المعرفي)",
        "kpi_description": "Teacher asks open-ended questions requiring reasoning ('لماذا؟', 'كيف توصلتِ؟', 'قارني بين…'), Questions require more than one-word/recall answers, Teacher probes with follow-up ('هل يمكنك التوسع؟', 'ماذا تقصدين بـ…؟')"
    },
    {
        "kpi_code": "5.1b",
        "kpi_name": "التحقق من الفهم بأساليب متعمدة",
        "kpi_description": "Teacher uses cold call (not only volunteers) ('من لم يُجب بعد…'), Teacher uses wait time before accepting answers, Teacher uses whole-class CFU ('أشيري إذا وافقت…', 'من تعتقد X ومن تعتقد Y؟'), Teacher conducts explicit comprehension check before moving on"
    }
]

print(f"✓ Adding {len(new_kpis)} new sub-KPIs to database...\n")

try:
    # Connect to database
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        sslmode='require' if DB_SSL else 'disable'
    )
    cur = conn.cursor()
    
    # Get the next available kpi_id
    cur.execute("SELECT MAX(kpi_id) FROM public.kpis")
    max_id = cur.fetchone()[0] or 0
    next_id = max_id + 1
    
    print(f"Next KPI ID will be: {next_id}\n")
    
    # Insert new KPIs
    for idx, kpi in enumerate(new_kpis):
        try:
            cur.execute("""
                INSERT INTO public.kpis (kpi_id, kpi_code, kpi_name, kpi_description)
                VALUES (%s, %s, %s, %s)
            """, (next_id + idx, kpi['kpi_code'], kpi['kpi_name'], kpi['kpi_description']))
            print(f"✓ Added {kpi['kpi_code']}: {kpi['kpi_name']}")
        except psycopg2.IntegrityError as e:
            print(f"⚠ {kpi['kpi_code']} already exists - skipping")
            conn.rollback()
    
    # Commit changes
    conn.commit()
    
    print(f"\n✅ Sub-KPIs added successfully!")
    
    # Verify
    cur.execute("SELECT COUNT(*) FROM public.kpis")
    total_count = cur.fetchone()[0]
    print(f"   - Total KPIs in database: {total_count}")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
    if conn:
        conn.rollback()
        conn.close()
    exit(1)
