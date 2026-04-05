/* ============================================================
KPI DOMAINS & TYPES SETUP
This script adds the teaching evaluation framework with 8 domains
and their associated 16 KPIs.
============================================================ */

-- Create KPI Domains (KPI Types) table if not exists
CREATE TABLE IF NOT EXISTS kpi_domains (
    domain_id SERIAL PRIMARY KEY,
    domain_code VARCHAR(20) NOT NULL UNIQUE,
    domain_name VARCHAR(255) NOT NULL,
    domain_name_en VARCHAR(255),
    domain_description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Teaching Domains
INSERT INTO kpi_domains (domain_code, domain_name, domain_name_en, domain_description, sort_order)
VALUES
    ('D1', 'إعداد وتنفيذ خطة التعلم داخل الحصة',
     'Domain 1: In-Class Lesson Planning & Execution',
     'Planning and implementing learning strategies within the classroom session', 1),
    ('D2', 'تنوع استراتيجيات التدريس',
     'Domain 2: Diversity of Teaching Strategies',
     'Diversity of teaching strategies and methods', 2),
    ('D3', 'تهيئة البيئة التعليمية',
     'Domain 3: Learning Environment',
     'Preparing and organizing the educational environment', 3),
    ('D4', 'الإدارة الصفية',
     'Domain 4: Classroom Management',
     'Classroom management and organization', 4),
    ('D5', 'تنوع أساليب التقويم داخل الحصة',
     'Domain 5: Diversity of In-Class Assessment',
     'Diversity of assessment methods within the session', 5),
    ('D6', 'تحليل مشاركات الطلاب وتشخيص مستوياتهم',
     'Domain 6: Analysing Student Responses & Diagnosing Learning Levels',
     'Analyzing student participation and diagnosing their levels', 6),
    ('D7', 'توظيف تقنيات ووسائل التعلم المناسبة',
     'Domain 7: Use of Technology & Learning Resources',
     'Utilizing appropriate learning technologies and tools', 7),
    ('D8', 'تحسين نتائج المتعلمين',
     'Domain 8: Improving Learner Outcomes',
     'Improving learner outcomes and achievement', 8)
ON CONFLICT (domain_code) DO NOTHING;
ON CONFLICT (domain_code) DO NOTHING;

-- Insert KPIs for Domain 1: إعداد وتنفيذ خطة التعلم داخل الحصة (D1)
INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
VALUES ((SELECT domain_id FROM kpi_domains WHERE domain_code = 'D1'), '1.1', 'وضوح هدف الدرس ومعيار النجاح', 'Clarity of lesson objectives and success criteria and linking them to student work') ON CONFLICT (kpi_code) DO NOTHING;

INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
VALUES ((SELECT domain_id FROM kpi_domains WHERE domain_code = 'D1'), '1.2', 'تسلسل الدرس وإيقاعه وإدارة الوقت', 'Lesson sequence, pace, and time management') ON CONFLICT (kpi_code) DO NOTHING;

-- Insert KPIs for Domain 2: تنوع استراتيجيات التدريس (D2)
INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
VALUES ((SELECT domain_id FROM kpi_domains WHERE domain_code = 'D2'), '2.1', 'النمذجة + الممارسة الموجهة', 'Modeling and guided practice strategies') ON CONFLICT (kpi_code) DO NOTHING;

INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
VALUES ((SELECT domain_id FROM kpi_domains WHERE domain_code = 'D2'), '2.2', 'توظيف التعلم النشط', 'Active learning requiring student production and engagement') ON CONFLICT (kpi_code) DO NOTHING;

INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
VALUES ((SELECT domain_id FROM kpi_domains WHERE domain_code = 'D2'), '2.3', 'التدريس الاستجابي', 'Responsive teaching: modifying explanation/activity based on evidence of understanding') ON CONFLICT (kpi_code) DO NOTHING;

-- Insert KPIs for Domain 3: تهيئة البيئة التعليمية (D3)
INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
VALUES ((SELECT domain_id FROM kpi_domains WHERE domain_code = 'D3'), '3.1', 'وضوح التوجيهات وبنية المهمة', 'Clear directions and task structure so students know what to do now') ON CONFLICT (kpi_code) DO NOTHING;

INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
VALUES ((SELECT domain_id FROM kpi_domains WHERE domain_code = 'D3'), '3.2', 'مناخ تعلم إيجابي', 'Positive learning climate (respect, encouragement, safe errors) supporting learner participation') ON CONFLICT (kpi_code) DO NOTHING;

-- Insert KPIs for Domain 4: الإدارة الصفية (D4)
INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
VALUES ((SELECT domain_id FROM kpi_domains WHERE domain_code = 'D4'), '4.1', 'روتين وإجراءات صفية ثابتة', 'Consistent classroom routines and procedures') ON CONFLICT (kpi_code) DO NOTHING;

INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
VALUES ((SELECT domain_id FROM kpi_domains WHERE domain_code = 'D4'), '4.2', 'إدارة فاعلة لسلوك الطلاب', 'Effective management of student behavior during learning') ON CONFLICT (kpi_code) DO NOTHING;

-- Insert KPIs for Domain 5: تنوع أساليب التقويم داخل الحصة (D5)
INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
VALUES ((SELECT domain_id FROM kpi_domains WHERE domain_code = 'D5'), '5.1', 'جودة الأسئلة والتحقق من الفهم', 'Quality of questions and verification of understanding') ON CONFLICT (kpi_code) DO NOTHING;

INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
VALUES ((SELECT domain_id FROM kpi_domains WHERE domain_code = 'D5'), '5.2', 'تنوع أدوات التقويم التكويني', 'Diversity of formative assessment tools within the session') ON CONFLICT (kpi_code) DO NOTHING;

-- Insert KPIs for Domain 6: تحليل مشاركات الطلاب وتشخيص مستوياتهم (D6)
INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
VALUES ((SELECT domain_id FROM kpi_domains WHERE domain_code = 'D6'), '6.1', 'توظيف إجابات الطلاب لتشخيص الفجوات', 'Using student responses to diagnose learning gaps') ON CONFLICT (kpi_code) DO NOTHING;

INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
VALUES ((SELECT domain_id FROM kpi_domains WHERE domain_code = 'D6'), '6.2', 'معالجة فجوات التعلم داخل الحصة', 'Addressing learning gaps within the session') ON CONFLICT (kpi_code) DO NOTHING;

-- Insert KPIs for Domain 7: توظيف تقنيات ووسائل التعلم المناسبة (D7)
INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
VALUES ((SELECT domain_id FROM kpi_domains WHERE domain_code = 'D7'), '7.1', 'ربط التقنية لتحقيق هدف الدرس', 'Linking technology to achieve lesson objectives and support understanding and application') ON CONFLICT (kpi_code) DO NOTHING;

INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
VALUES ((SELECT domain_id FROM kpi_domains WHERE domain_code = 'D7'), '7.2', 'استخدام التقنية بشكل محكم', 'Using technology purposefully without being distracting from learning process') ON CONFLICT (kpi_code) DO NOTHING;

-- Insert KPIs for Domain 8: تحسين نتائج المتعلمين (D8)
INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
VALUES ((SELECT domain_id FROM kpi_domains WHERE domain_code = 'D8'), '8.1', 'شواهد تقدّم داخل الحصة', 'Evidence of progress within the session (before/after) when clear evidence is available') ON CONFLICT (kpi_code) DO NOTHING;

INSERT INTO kpis (domain_id, kpi_code, kpi_name, kpi_description) 
VALUES ((SELECT domain_id FROM kpi_domains WHERE domain_code = 'D8'), '8.2', 'بيانات طولية للنتائج', 'Longitudinal data for results: mark as insufficient data if results require longitudinal data') ON CONFLICT (kpi_code) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kpi_domains_code ON kpi_domains(domain_code);
CREATE INDEX IF NOT EXISTS idx_kpis_domain_id ON kpis(domain_id);
CREATE INDEX IF NOT EXISTS idx_kpis_code ON kpis(kpi_code);

-- Add comments
COMMENT ON TABLE kpi_domains IS 'Teaching evaluation framework domains (8 domains)';
COMMENT ON COLUMN kpi_domains.domain_code IS 'Domain code (D1-D8)';
COMMENT ON COLUMN kpi_domains.domain_name IS 'Domain name in Arabic and English';
COMMENT ON COLUMN kpi_domains.domain_description IS 'Description of the domain';
COMMENT ON COLUMN kpi_domains.sort_order IS 'Order for display';
