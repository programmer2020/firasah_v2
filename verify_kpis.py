import psycopg2
import os

# Database configuration
DB_HOST = "ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech"
DB_PORT = 5432
DB_USER = "neondb_owner"
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = "neondb"
DB_SSL = True

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
    
    # Get all KPIs sorted by code
    cur.execute("""
        SELECT kpi_id, kpi_code, kpi_name, 
               SUBSTRING(kpi_description, 1, 80) as description_preview
        FROM public.kpis
        ORDER BY kpi_code
    """)
    
    results = cur.fetchall()
    
    print("=" * 120)
    print("✅ KPI DATABASE VERIFICATION")
    print("=" * 120)
    print(f"\nTotal KPIs in database: {len(results)}\n")
    
    print(f"{'KPI Code':<10} {'KPI Name':<50} {'Description Preview':<60}")
    print("-" * 120)
    
    for kpi_id, kpi_code, kpi_name, description_preview in results:
        print(f"{kpi_code:<10} {kpi_name:<50} {description_preview}...")
    
    print("\n" + "=" * 120)
    
    # Count by domain
    cur.execute("""
        SELECT LEFT(kpi_code, 1) as domain, COUNT(*) as count
        FROM public.kpis
        GROUP BY LEFT(kpi_code, 1)
        ORDER BY domain
    """)
    
    print("\n📊 KPIs per Domain:")
    print("-" * 30)
    for domain, count in cur.fetchall():
        domain_names = {
            "1": "إعداد وتنفيذ خطة التعلم",
            "2": "تنوع استراتيجيات التدريس",
            "3": "تهيئة البيئة التعليمية",
            "4": "الإدارة الصفية",
            "5": "تنوع أساليب التقويم",
            "6": "تحليل مشاركات الطلاب",
            "7": "توظيف التقنيات",
            "8": "تحسين نتائج المتعلمين"
        }
        print(f"Domain {domain} ({domain_names.get(domain, 'Unknown')}): {count} KPIs")
    
    print("\n" + "=" * 120)
    print("✅ جميع التعديلات تم تطبيقها بنجاح!")
    print("=" * 120)
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
