/* ============================================================
KPI DOMAINS & TYPES SETUP
This script adds the teaching evaluation framework with 8 domains
and their associated 16 KPIs.
============================================================ */

-- Create KPI Domains (KPI Types) table if not exists
CREATE TABLE IF NOT EXISTS domains (
    domain_id SERIAL PRIMARY KEY,
    domain_code VARCHAR(20) NOT NULL UNIQUE,
    domain_name VARCHAR(255) NOT NULL,
    domain_description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Teaching Domains
INSERT INTO domains (domain_code, domain_name, domain_description, sort_order) 
VALUES 
    ('D1', 'إعداد وتنفيذ خطة التعلم داخل الحصة', 
     'Planning and implementing learning strategies within the classroom session', 1),
    ('D2', 'تنوع استراتيجيات التدريس', 
     'Diversity of teaching strategies and methods', 2),
    ('D3', 'تهيئة البيئة التعليمية', 
     'Preparing and organizing the educational environment', 3),
    ('D4', 'الإدارة الصفية', 
     'Classroom management and organization', 4),
    ('D5', 'تنوع أساليب التقويم داخل الحصة', 
     'Diversity of assessment methods within the session', 5),
    ('D6', 'تحليل مشاركات الطلاب وتشخيص مستوياتهم', 
     'Analyzing student participation and diagnosing their levels', 6),
    ('D7', 'توظيف تقنيات ووسائل التعلم المناسبة', 
     'Utilizing appropriate learning technologies and tools', 7),
    ('D8', 'تحسين نتائج المتعلمين', 
     'Improving learner outcomes and achievement', 8)
ON CONFLICT (domain_code) DO NOTHING;

-- Insert KPIs for Domain 1: إعداد وتنفيذ خطة التعلم داخل الحصة (D1)
INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
SELECT domain_id, '1.1', 'وضوح هدف الدرس ومعيار النجاح', 'Clarity of lesson objectives and success criteria and linking them to student work'
FROM domains
WHERE domain_code = 'D1'
  AND NOT EXISTS (SELECT 1 FROM kpis WHERE kpi_code = '1.1');

INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
SELECT domain_id, '1.2', 'تسلسل الدرس وإيقاعه وإدارة الوقت', 'Lesson sequence, pace, and time management'
FROM domains
WHERE domain_code = 'D1'
  AND NOT EXISTS (SELECT 1 FROM kpis WHERE kpi_code = '1.2');

-- Insert KPIs for Domain 2: تنوع استراتيجيات التدريس (D2)
INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
SELECT domain_id, '2.1', 'النمذجة + الممارسة الموجهة', 'Modeling and guided practice strategies'
FROM domains
WHERE domain_code = 'D2'
  AND NOT EXISTS (SELECT 1 FROM kpis WHERE kpi_code = '2.1');

INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
SELECT domain_id, '2.2', 'توظيف التعلم النشط', 'Active learning requiring student production and engagement'
FROM domains
WHERE domain_code = 'D2'
  AND NOT EXISTS (SELECT 1 FROM kpis WHERE kpi_code = '2.2');

INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
SELECT domain_id, '2.3', 'التدريس الاستجابي', 'Responsive teaching: modifying explanation/activity based on evidence of understanding'
FROM domains
WHERE domain_code = 'D2'
  AND NOT EXISTS (SELECT 1 FROM kpis WHERE kpi_code = '2.3');

-- Insert KPIs for Domain 3: تهيئة البيئة التعليمية (D3)
INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
SELECT domain_id, '3.1', 'وضوح التوجيهات وبنية المهمة', 'Clear directions and task structure so students know what to do now'
FROM domains
WHERE domain_code = 'D3'
  AND NOT EXISTS (SELECT 1 FROM kpis WHERE kpi_code = '3.1');

INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
SELECT domain_id, '3.2', 'مناخ تعلم إيجابي', 'Positive learning climate (respect, encouragement, safe errors) supporting learner participation'
FROM domains
WHERE domain_code = 'D3'
  AND NOT EXISTS (SELECT 1 FROM kpis WHERE kpi_code = '3.2');

-- Insert KPIs for Domain 4: الإدارة الصفية (D4)
INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
SELECT domain_id, '4.1', 'روتين وإجراءات صفية ثابتة', 'Consistent classroom routines and procedures'
FROM domains
WHERE domain_code = 'D4'
  AND NOT EXISTS (SELECT 1 FROM kpis WHERE kpi_code = '4.1');

INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
SELECT domain_id, '4.2', 'إدارة فاعلة لسلوك الطلاب', 'Effective management of student behavior during learning'
FROM domains
WHERE domain_code = 'D4'
  AND NOT EXISTS (SELECT 1 FROM kpis WHERE kpi_code = '4.2');

-- Insert KPIs for Domain 5: تنوع أساليب التقويم داخل الحصة (D5)
INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
SELECT domain_id, '5.1', 'جودة الأسئلة والتحقق من الفهم', 'Quality of questions and verification of understanding'
FROM domains
WHERE domain_code = 'D5'
  AND NOT EXISTS (SELECT 1 FROM kpis WHERE kpi_code = '5.1');

INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
SELECT domain_id, '5.2', 'تنوع أدوات التقويم التكويني', 'Diversity of formative assessment tools within the session'
FROM domains
WHERE domain_code = 'D5'
  AND NOT EXISTS (SELECT 1 FROM kpis WHERE kpi_code = '5.2');

-- Insert KPIs for Domain 6: تحليل مشاركات الطلاب وتشخيص مستوياتهم (D6)
INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
SELECT domain_id, '6.1', 'توظيف إجابات الطلاب لتشخيص الفجوات', 'Using student responses to diagnose learning gaps'
FROM domains
WHERE domain_code = 'D6'
  AND NOT EXISTS (SELECT 1 FROM kpis WHERE kpi_code = '6.1');

INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
SELECT domain_id, '6.2', 'معالجة فجوات التعلم داخل الحصة', 'Addressing learning gaps within the session'
FROM domains
WHERE domain_code = 'D6'
  AND NOT EXISTS (SELECT 1 FROM kpis WHERE kpi_code = '6.2');

-- Insert KPIs for Domain 7: توظيف تقنيات ووسائل التعلم المناسبة (D7)
INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
SELECT domain_id, '7.1', 'ربط التقنية لتحقيق هدف الدرس', 'Linking technology to achieve lesson objectives and support understanding and application'
FROM domains
WHERE domain_code = 'D7'
  AND NOT EXISTS (SELECT 1 FROM kpis WHERE kpi_code = '7.1');

INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
SELECT domain_id, '7.2', 'استخدام التقنية بشكل محكم', 'Using technology purposefully without being distracting from learning process'
FROM domains
WHERE domain_code = 'D7'
  AND NOT EXISTS (SELECT 1 FROM kpis WHERE kpi_code = '7.2');

-- Insert KPIs for Domain 8: تحسين نتائج المتعلمين (D8)
INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
SELECT domain_id, '8.1', 'شواهد تقدّم داخل الحصة', 'Evidence of progress within the session (before/after) when clear evidence is available'
FROM domains
WHERE domain_code = 'D8'
  AND NOT EXISTS (SELECT 1 FROM kpis WHERE kpi_code = '8.1');

INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
SELECT domain_id, '8.2', 'بيانات طولية للنتائج', 'Longitudinal data for results: mark as insufficient data if results require longitudinal data'
FROM domains
WHERE domain_code = 'D8'
  AND NOT EXISTS (SELECT 1 FROM kpis WHERE kpi_code = '8.2');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_domains_code ON domains(domain_code);
CREATE INDEX IF NOT EXISTS idx_kpis_domain_id ON kpis(domain_id);
CREATE INDEX IF NOT EXISTS idx_kpis_code ON kpis(kpi_code);

-- Add comments
COMMENT ON TABLE domains IS 'Teaching evaluation framework domains (8 domains)';
COMMENT ON COLUMN domains.domain_code IS 'Domain code (D1-D8)';
COMMENT ON COLUMN domains.domain_name IS 'Domain name in Arabic and English';
COMMENT ON COLUMN domains.domain_description IS 'Description of the domain';
COMMENT ON COLUMN domains.sort_order IS 'Order for display';
