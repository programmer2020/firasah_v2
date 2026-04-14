#!/bin/bash

# ==============================================================================
# Data Isolation Migration Script
# Applies all necessary migrations for multi-tenant data isolation
# ==============================================================================

set -e

echo "========================================"
echo "🔒 Data Isolation Migration Script"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  منبهات مهمة:${NC}"
echo "1. تأكد من النسخ الاحتياطية للبيانات قبل المتابعة"
echo "2. تأكد من توصيل قاعدة البيانات"
echo "3. جميع التطبيقات يجب أن تكون محقوقة"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql غير مثبت. يرجى تثبيت PostgreSQL client tools${NC}"
    exit 1
fi

# Get database credentials from environment or .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-firasah_ai}"

echo -e "${YELLOW}معلومات قاعدة البيانات:${NC}"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Step 1: Apply columns migration
echo -e "${YELLOW}الخطوة 1: إضافة أعمدة created_by...${NC}"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db-migrations/add_data_isolation_columns.sql; then
    echo -e "${GREEN}✅ تم إضافة الأعمدة بنجاح${NC}"
else
    echo -e "${RED}❌ فشل في إضافة الأعمدة${NC}"
    exit 1
fi

echo ""

# Step 2: Apply triggers migration
echo -e "${YELLOW}الخطوة 2: إضافة triggers للتحديث التلقائي...${NC}"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db-migrations/add_data_isolation_triggers.sql; then
    echo -e "${GREEN}✅ تم إضافة triggers بنجاح${NC}"
else
    echo -e "${RED}❌ فشل في إضافة triggers${NC}"
    exit 1
fi

echo ""

# Step 3: Verify the setup
echo -e "${YELLOW}الخطوة 3: التحقق من الإعدادات...${NC}"
echo ""

echo "✓ الأعمدة المضافة:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE column_name = 'created_by'
ORDER BY table_name;
"

echo ""
echo "✓ Triggers المضافة:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('sound_files', 'lecture', 'fragments', 'evidences')
ORDER BY event_object_table;
"

echo ""
echo -e "${GREEN}========================================"
echo "✅ اكتمل تطبيق Data Isolation بنجاح!"
echo "========================================${NC}"
echo ""
echo -e "${YELLOW}الخطوات التالية:${NC}"
echo "1. أعد تشغيل Backend: npm start"
echo "2. اختبر الـ endpoints للتأكد من الفصل"
echo "3. راقب الـ logs للأخطاء"
echo ""
