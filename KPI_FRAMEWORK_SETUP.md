# KPI Domains & Framework Setup Documentation

## Overview
Added a complete teaching evaluation framework with 8 domains and 16 Key Performance Indicators (KPIs) to the Firasah AI database. This enables structured assessment of teaching quality across multiple dimensions.

## Database Structure

### New Tables

#### `kpi_domains` Table
Stores the 8 teaching evaluation framework domains:

```sql
CREATE TABLE kpi_domains (
    domain_id SERIAL PRIMARY KEY,
    domain_code VARCHAR(20) NOT NULL UNIQUE,      -- D1-D8
    domain_name VARCHAR(255) NOT NULL,            -- Arabic + English name
    domain_description TEXT,                      -- Full description
    sort_order INT NOT NULL DEFAULT 0,            -- Display order
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `kpis` Table (Updated)
Modified to include domain reference and KPI-specific fields:

```sql
ALTER TABLE kpis ADD COLUMN domain_id INTEGER REFERENCES kpi_domains(domain_id) ON DELETE CASCADE;
ALTER TABLE kpis ADD COLUMN kpi_code VARCHAR(20);           -- Code like "1.1", "4.2"
ALTER TABLE kpis ADD COLUMN kpi_description TEXT;          -- Full KPI description
```

## Teaching Domains (8 Total)

| Code | Domain Name | Description |
|------|------------|-------------|
| D1 | إعداد وتنفيذ خطة التعلم داخل الحصة | Planning and implementing learning strategies within the classroom session |
| D2 | تنوع استراتيجيات التدريس | Diversity of teaching strategies and methods |
| D3 | تهيئة البيئة التعليمية | Preparing and organizing the educational environment |
| D4 | الإدارة الصفية | Classroom management and organization |
| D5 | تنوع أساليب التقويم داخل الحصة | Diversity of assessment methods within the session |
| D6 | تحليل مشاركات الطلاب وتشخيص مستوياتهم | Analyzing student participation and diagnosing their levels |
| D7 | توظيف تقنيات ووسائل التعلم المناسبة | Utilizing appropriate learning technologies and tools |
| D8 | تحسين نتائج المتعلمين | Improving learner outcomes and achievement |

## KPIs by Domain (16 Total)

### Domain 1: Planning & Learning Implementation
- **KPI 1.1**: وضوح هدف الدرس ومعيار النجاح (Lesson objectives clarity and success criteria)
- **KPI 1.2**: تسلسل الدرس وإيقاعه وإدارة الوقت (Lesson sequence, pace, and time management)

### Domain 2: Teaching Strategy Diversity
- **KPI 2.1**: النمذجة + الممارسة الموجهة (Modeling and guided practice)
- **KPI 2.2**: توظيف التعلم النشط (Active learning with student production)
- **KPI 2.3**: التدريس الاستجابي (Responsive teaching based on understanding evidence)

### Domain 3: Learning Environment
- **KPI 3.1**: وضوح التوجيهات وبنية المهمة (Clear directions and task structure)
- **KPI 3.2**: مناخ تعلم إيجابي (Positive climate supporting participation)

### Domain 4: Classroom Management
- **KPI 4.1**: روتين وإجراءات صفية ثابتة (Consistent classroom routines and procedures)
- **KPI 4.2**: إدارة فاعلة لسلوك الطلاب (Effective student behavior management)

### Domain 5: Assessment Methods
- **KPI 5.1**: جودة الأسئلة والتحقق من الفهم (Quality questions and understanding verification)
- **KPI 5.2**: تنوع أدوات التقويم التكويني (Diversity of formative assessment tools)

### Domain 6: Student Analysis & Diagnosis
- **KPI 6.1**: توظيف إجابات الطلاب لتشخيص الفجوات (Using responses to diagnose gaps)
- **KPI 6.2**: معالجة فجوات التعلم داخل الحصة (Addressing learning gaps in session)

### Domain 7: Technology & Tools
- **KPI 7.1**: ربط التقنية لتحقيق هدف الدرس (Linking technology to lesson objectives)
- **KPI 7.2**: استخدام التقنية بشكل محكم (Purposeful technology use)

### Domain 8: Learner Outcomes
- **KPI 8.1**: شواهد تقدّم داخل الحصة (In-session progress evidence)
- **KPI 8.2**: بيانات طولية للنتائج (Longitudinal data requirements)

## New API Endpoints

### Domain Endpoints

#### Get All Domains
```
GET /api/kpis/domains/all
```
Response:
```json
{
  "success": true,
  "message": "KPI domains retrieved successfully",
  "data": [
    {
      "domain_id": 1,
      "domain_code": "D1",
      "domain_name": "إعداد وتنفيذ خطة التعلم داخل الحصة",
      "domain_description": "Planning and implementing learning strategies...",
      "sort_order": 1,
      "created_at": "2026-03-09T...",
      "updated_at": "2026-03-09T..."
    }
  ]
}
```

#### Get Domain by ID
```
GET /api/kpis/domains/:id
```

#### Get All KPIs Grouped by Domain
```
GET /api/kpis/domains-grouped
```
Response shows domains with nested KPIs:
```json
{
  "success": true,
  "message": "KPIs grouped by domain retrieved successfully",
  "data": [
    {
      "domain_id": 1,
      "domain_code": "D1",
      "domain_name": "إعداد وتنفيذ خطة التعلم داخل الحصة",
      "domain_description": "...",
      "sort_order": 1,
      "kpis": [
        {
          "kpi_id": 1,
          "kpi_code": "1.1",
          "kpi_name": "وضوح هدف الدرس ومعيار النجاح",
          "kpi_description": "Clarity of lesson objectives...",
          "createdAt": "2026-03-09T...",
          "createdBy": "system",
          "note": null
        }
      ]
    }
  ]
}
```

#### Get KPIs by Domain
```
GET /api/kpis/by-domain/:domainId
```

## Installation Instructions

### 1. Apply Database Changes

#### For Fresh Installation:
The `kpi_domains` table is automatically created when running schema initialization.

#### For Existing Databases:
Run the migration script:
```sql
-- Execute from: database/add_kpi_domains.sql
psql -U postgres -d firasah_db -f add_kpi_domains.sql
```

Or use your existing migration tool:
```bash
npm run migrate database/add_kpi_domains.sql
```

### 2. Verify Installation

Check the database contains all domains and KPIs:
```sql
SELECT COUNT(*) FROM kpi_domains;  -- Should show 8
SELECT COUNT(*) FROM kpis;          -- Should show 16+
```

### 3. Test API Endpoints

```bash
# Test domains endpoint
curl http://localhost:5000/api/kpis/domains/all

# Test grouped KPIs
curl http://localhost:5000/api/kpis/domains-grouped

# Test KPIs for specific domain
curl http://localhost:5000/api/kpis/by-domain/1
```

## Backend Implementation

### New Service Functions (kpisService.ts)

```typescript
// Get all domains
export const getAllKPIDomains = async () { ... }

// Get domain by ID
export const getKPIDomainById = async (domainId: number) { ... }

// Get KPIs organized by domain (with nested structure)
export const getKPIsGroupedByDomain = async () { ... }

// Get KPIs for specific domain
export const getKPIsByDomain = async (domainId: number) { ... }
```

### New Route Handlers (kpisRoutes.ts)

Created 4 new routes under `/api/kpis/` prefix:
- `GET /domains/all` - All domains
- `GET /domains/:id` - Single domain
- `GET /domains-grouped` - Domains with nested KPIs
- `GET /by-domain/:domainId` - KPIs for domain

## Frontend Integration Example

```javascript
// Fetch all domains with their KPIs
const response = await fetch('http://localhost:5000/api/kpis/domains-grouped');
const { data: domains } = await response.json();

// Structure for rendering
domains.forEach(domain => {
  console.log(domain.domain_name);
  domain.kpis.forEach(kpi => {
    console.log(`  - ${kpi.kpi_code}: ${kpi.kpi_name}`);
  });
});
```

## Relationships

```
kpi_domains (1) ──→ (Many) kpis
                        └──→ (Many) evidences
                        └──→ (Many) evaluations
```

### Foreign Keys:
- `kpis.domain_id` → `kpi_domains.domain_id` (ON DELETE CASCADE)
- `evidences.kpi_id` → `kpis.kpi_id` (ON DELETE CASCADE)
- `evaluations.kpi_id` → `kpis.kpi_id` (ON DELETE CASCADE)

## Data Files

### Database Files:
- `database/add_kpi_domains.sql` - Full domain and KPI setup script
- `backend/database/schema.sql` - Updated schema with kpi_domains table

### Updated Backend Files:
- `backend/src/services/kpisService.ts` - New domain query functions
- `backend/src/routes/kpisRoutes.ts` - New domain endpoints

## Usage Notes

1. **Domain Codes (D1-D8)**: Used for referencing in evaluations and reports
2. **KPI Codes (1.1-8.2)**: Used for quick identification in evaluation forms
3. **Sort Order**: Determines display order in UI (1-8 for domains)
4. **Arabic Names**: Full Arabic descriptions for local deployment
5. **ON DELETE CASCADE**: Deleting a domain removes all associated KPIs and related evidence/evaluations

## Indexes for Performance

```sql
CREATE INDEX idx_kpi_domains_code ON kpi_domains(domain_code);
CREATE INDEX idx_kpis_domain_id ON kpis(domain_id);
CREATE INDEX idx_kpis_code ON kpis(kpi_code);
```

These indexes optimize queries for:
- Looking up domains by code
- Filtering KPIs by domain
- Searching KPIs by code

## Next Steps

1. **Frontend Components**: Create UI for displaying domain structures
2. **Evaluation Forms**: Link to KPI selection in evaluation creation
3. **Reports**: Generate reports grouped by domain
4. **Analytics**: Track teacher performance by domain
