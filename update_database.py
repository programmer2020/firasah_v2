import json
import psycopg2
import os

# Database configuration from backend/.env
DB_HOST = "ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech"
DB_PORT = 5432
DB_USER = "neondb_owner"
DB_PASSWORD = "npg_o4iEtH5mkKIz"
DB_NAME = "neondb"
DB_SSL = True

print(f"✓ Connecting to database {DB_NAME}...")

# Load KPI signals mapping
with open('kpi_detection_signals.json', 'r', encoding='utf-8') as f:
    kpi_signals = json.load(f)

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
    
    # Get current KPIs from database
    cur.execute("SELECT kpi_id, kpi_code FROM public.kpis ORDER BY kpi_id")
    current_kpis = cur.fetchall()
    
    print(f"\n✓ Found {len(current_kpis)} KPIs in database\n")
    
    # Update each KPI with detection signals
    updates_made = 0
    not_found = []
    
    for kpi_id, kpi_code in current_kpis:
        if kpi_code in kpi_signals:
            new_description = kpi_signals[kpi_code]
            
            cur.execute(
                "UPDATE public.kpis SET kpi_description = %s WHERE kpi_id = %s",
                (new_description, kpi_id)
            )
            updates_made += 1
            print(f"✓ Updated {kpi_code}: {new_description[:60]}...")
        else:
            not_found.append(kpi_code)
    
    # Commit changes
    conn.commit()
    
    print(f"\n✅ Database updated successfully!")
    print(f"   - {updates_made} KPIs updated")
    
    if not_found:
        print(f"   - {len(not_found)} KPIs not found in mapping: {', '.join(not_found)}")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
    if conn:
        conn.rollback()
        conn.close()
    exit(1)
