import psycopg2

DB_HOST = "ep-flat-king-a80gh336-pooler.eastus2.azure.neon.tech"
DB_PORT = 5432
DB_USER = "neondb_owner"
DB_PASSWORD = "npg_o4iEtH5mkKIz"
DB_NAME = "neondb"

try:
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        sslmode='require'
    )
    cur = conn.cursor()
    
    # Check if evidence table exists
    cur.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name='evidence' or table_name='evidences'
        ORDER BY ordinal_position
    """)
    
    columns = cur.fetchall()
    
    if columns:
        print("=== Evidence Table Structure ===\n")
        for col_name, data_type, is_nullable in columns:
            nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
            print(f"{col_name:<25} {data_type:<20} {nullable}")
        print()
    else:
        print("Evidence table not found, checking all tables...\n")
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema='public'
            ORDER BY table_name
        """)
        print("Available tables:")
        for table in cur.fetchall():
            print(f"  - {table[0]}")
    
    # Check lecture table structure
    cur.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name='lecture'
        ORDER BY ordinal_position
    """)
    
    print("\n=== Lecture Table Structure ===\n")
    for col_name, data_type, is_nullable in cur.fetchall():
        nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
        print(f"{col_name:<25} {data_type:<20} {nullable}")
    
    cur.close()
    conn.close()

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
