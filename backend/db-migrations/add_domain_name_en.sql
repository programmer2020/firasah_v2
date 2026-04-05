/* ============================================================
ADD domain_name_en COLUMN TO kpi_domains
Adds English domain names from the Firasah KPI Framework document
============================================================ */

-- Add the new column
ALTER TABLE kpi_domains
    ADD COLUMN IF NOT EXISTS domain_name_en VARCHAR(255);

-- Update each domain with its English name from the KPI Framework doc
UPDATE kpi_domains SET domain_name_en = 'Domain 1: In-Class Lesson Planning & Execution'
    WHERE domain_code = 'D1';

UPDATE kpi_domains SET domain_name_en = 'Domain 2: Diversity of Teaching Strategies'
    WHERE domain_code = 'D2';

UPDATE kpi_domains SET domain_name_en = 'Domain 3: Learning Environment'
    WHERE domain_code = 'D3';

UPDATE kpi_domains SET domain_name_en = 'Domain 4: Classroom Management'
    WHERE domain_code = 'D4';

UPDATE kpi_domains SET domain_name_en = 'Domain 5: Diversity of In-Class Assessment'
    WHERE domain_code = 'D5';

UPDATE kpi_domains SET domain_name_en = 'Domain 6: Analysing Student Responses & Diagnosing Learning Levels'
    WHERE domain_code = 'D6';

UPDATE kpi_domains SET domain_name_en = 'Domain 7: Use of Technology & Learning Resources'
    WHERE domain_code = 'D7';

UPDATE kpi_domains SET domain_name_en = 'Domain 8: Improving Learner Outcomes'
    WHERE domain_code = 'D8';

-- Add comment
COMMENT ON COLUMN kpi_domains.domain_name_en IS 'Domain name in English (from Firasah KPI Framework)';
