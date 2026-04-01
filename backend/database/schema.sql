/* ============================================================
FIRASAAI DATABASE CORE STRUCTURE
This schema manages schools, grades, sections, classes,
teachers, subjects and schedules for FirasaAI classroom analytics.
============================================================ */


/* ============================================================
TABLE: users
Description:
Stores user authentication information for Firasah AI platform.
============================================================ */

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


/* ============================================================
TABLE: schools
Description:
Stores all schools registered in the FirasaAI platform.
============================================================ */

CREATE TABLE schools (
    school_id SERIAL PRIMARY KEY,
    school_name VARCHAR(200) NOT NULL,
    city VARCHAR(100),
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


/* ============================================================
TABLE: grades
Description:
Represents academic grades within a school
(e.g., Grade 1, Grade 6).
============================================================ */

CREATE TABLE grades (
    grade_id SERIAL PRIMARY KEY,
    school_id INT NOT NULL,
    grade_name VARCHAR(50) NOT NULL,
    grade_level INT NOT NULL,

    CONSTRAINT fk_grade_school
        FOREIGN KEY (school_id)
        REFERENCES schools(school_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_grade_per_school
        UNIQUE (school_id, grade_level)
);


/* ============================================================
TABLE: sections
Description:
Represents section labels within grades (A,B,C...).
============================================================ */

CREATE TABLE sections (
    section_id SERIAL PRIMARY KEY,
    section_name VARCHAR(10) NOT NULL UNIQUE
);


/* ============================================================
TABLE: classes
Description:
Represents a physical classroom grouping (Grade + Section).
Example: Grade 6 - Section A.
This table avoids repeating grade and section combinations.
============================================================ */

CREATE TABLE classes (
    class_id SERIAL PRIMARY KEY,
    grade_id INT NOT NULL,
    section_id INT NOT NULL,
    class_name VARCHAR(100),

    CONSTRAINT fk_class_grade
        FOREIGN KEY (grade_id)
        REFERENCES grades(grade_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_class_section
        FOREIGN KEY (section_id)
        REFERENCES sections(section_id),

    CONSTRAINT uq_grade_section
        UNIQUE (grade_id, section_id)
);


/* ============================================================
TABLE: subjects
Description:
Stores school subjects such as Math, Science, English.
============================================================ */

CREATE TABLE subjects (
    subject_id SERIAL PRIMARY KEY,
    subject_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


/* ============================================================
TABLE: teachers
Description:
Stores teacher information. Teachers belong to a school.
============================================================ */

CREATE TABLE teachers (
    teacher_id SERIAL PRIMARY KEY,
    school_id INT NOT NULL,
    teacher_name VARCHAR(200) NOT NULL,
    teacher_email VARCHAR(200) UNIQUE,
    teacher_phone VARCHAR(50),

    CONSTRAINT fk_teacher_school
        FOREIGN KEY (school_id)
        REFERENCES schools(school_id)
        ON DELETE CASCADE
);


/* ============================================================
TABLE: section_time_slots
Description:
Defines weekly time slots available for each class.
Example: Sunday 7:00–8:00 AM for Class (Grade 6A).
============================================================ */

CREATE TABLE section_time_slots (
    time_slot_id SERIAL PRIMARY KEY,
    class_id INT NOT NULL,
    subject_id INT NOT NULL,
    teacher_id INT REFERENCES teachers(teacher_id) ON DELETE SET NULL,
    day_of_week VARCHAR(10) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    CONSTRAINT fk_timeslot_class
        FOREIGN KEY (class_id)
        REFERENCES classes(class_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_timeslot_subject
        FOREIGN KEY (subject_id)
        REFERENCES subjects(subject_id),

    CONSTRAINT chk_valid_time
        CHECK (end_time > start_time)
);

CREATE INDEX idx_section_time_slots_subject_id ON section_time_slots(subject_id);
CREATE INDEX idx_section_time_slots_teacher_id ON section_time_slots(teacher_id);


/* ============================================================
USERS TABLE - For Authentication
============================================================ */

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


/* ============================================================
SAMPLE DATA
============================================================ */


/* Schools */

INSERT INTO schools (school_name, city, country)
VALUES
('Riyadh International School','Riyadh','Saudi Arabia');


/* Grades */

INSERT INTO grades (school_id, grade_name, grade_level)
VALUES
(1,'Grade 5',5),
(1,'Grade 6',6);


/* Sections */

INSERT INTO sections (section_name)
VALUES
('A'),
('B'),
('C');


/* Classes (Grade + Section) */

INSERT INTO classes (grade_id, section_id, class_name)
VALUES
(2, 1, 'Grade 6 - A'),    -- Grade 6A
(2, 2, 'Grade 6 - B'),    -- Grade 6B
(1, 1, 'Grade 5 - A');    -- Grade 5A


/* Subjects */

INSERT INTO subjects (subject_name)
VALUES
('Mathematics'),
('Science'),
('English');


/* Teachers */

INSERT INTO teachers (school_id, teacher_name, teacher_email, teacher_phone)
VALUES
(1,'Ahmed Al-Harbi','ahmed.harbi@school.com','0501111111'),
(1,'Sara Khan','sara.khan@school.com','0502222222'),
(1,'John Smith','john.smith@school.com','0503333333');


/* Time Slots — Sun–Thu, 45 min (105 rows); subject_id → subjects, teacher_id → teachers (FKs) */

INSERT INTO section_time_slots (class_id, subject_id, teacher_id, day_of_week, start_time, end_time)
VALUES
(1,3,1,'Sunday','07:00','07:45'),
(1,1,3,'Sunday','07:45','08:30'),
(1,2,2,'Sunday','08:30','09:15'),
(1,3,1,'Sunday','09:30','10:15'),
(1,1,3,'Sunday','10:15','11:00'),
(1,2,2,'Sunday','11:00','11:45'),
(1,3,1,'Sunday','12:00','12:45'),
(1,2,2,'Monday','07:00','07:45'),
(1,3,1,'Monday','07:45','08:30'),
(1,1,3,'Monday','08:30','09:15'),
(1,2,2,'Monday','09:30','10:15'),
(1,3,1,'Monday','10:15','11:00'),
(1,1,3,'Monday','11:00','11:45'),
(1,2,2,'Monday','12:00','12:45'),
(1,1,3,'Tuesday','07:00','07:45'),
(1,2,2,'Tuesday','07:45','08:30'),
(1,3,1,'Tuesday','08:30','09:15'),
(1,1,3,'Tuesday','09:30','10:15'),
(1,2,2,'Tuesday','10:15','11:00'),
(1,3,1,'Tuesday','11:00','11:45'),
(1,1,3,'Tuesday','12:00','12:45'),
(1,3,1,'Wednesday','07:00','07:45'),
(1,1,3,'Wednesday','07:45','08:30'),
(1,2,2,'Wednesday','08:30','09:15'),
(1,3,1,'Wednesday','09:30','10:15'),
(1,1,3,'Wednesday','10:15','11:00'),
(1,2,2,'Wednesday','11:00','11:45'),
(1,3,1,'Wednesday','12:00','12:45'),
(1,2,2,'Thursday','07:00','07:45'),
(1,3,1,'Thursday','07:45','08:30'),
(1,1,3,'Thursday','08:30','09:15'),
(1,2,2,'Thursday','09:30','10:15'),
(1,3,1,'Thursday','10:15','11:00'),
(1,1,3,'Thursday','11:00','11:45'),
(1,2,2,'Thursday','12:00','12:45'),
(2,3,3,'Sunday','07:00','07:45'),
(2,1,2,'Sunday','07:45','08:30'),
(2,2,1,'Sunday','08:30','09:15'),
(2,3,3,'Sunday','09:30','10:15'),
(2,1,2,'Sunday','10:15','11:00'),
(2,2,1,'Sunday','11:00','11:45'),
(2,3,3,'Sunday','12:00','12:45'),
(2,2,1,'Monday','07:00','07:45'),
(2,3,3,'Monday','07:45','08:30'),
(2,1,2,'Monday','08:30','09:15'),
(2,2,1,'Monday','09:30','10:15'),
(2,3,3,'Monday','10:15','11:00'),
(2,1,2,'Monday','11:00','11:45'),
(2,2,1,'Monday','12:00','12:45'),
(2,1,2,'Tuesday','07:00','07:45'),
(2,2,1,'Tuesday','07:45','08:30'),
(2,3,3,'Tuesday','08:30','09:15'),
(2,1,2,'Tuesday','09:30','10:15'),
(2,2,1,'Tuesday','10:15','11:00'),
(2,3,3,'Tuesday','11:00','11:45'),
(2,1,2,'Tuesday','12:00','12:45'),
(2,3,3,'Wednesday','07:00','07:45'),
(2,1,2,'Wednesday','07:45','08:30'),
(2,2,1,'Wednesday','08:30','09:15'),
(2,3,3,'Wednesday','09:30','10:15'),
(2,1,2,'Wednesday','10:15','11:00'),
(2,2,1,'Wednesday','11:00','11:45'),
(2,3,3,'Wednesday','12:00','12:45'),
(2,2,1,'Thursday','07:00','07:45'),
(2,3,3,'Thursday','07:45','08:30'),
(2,1,2,'Thursday','08:30','09:15'),
(2,2,1,'Thursday','09:30','10:15'),
(2,3,3,'Thursday','10:15','11:00'),
(2,1,2,'Thursday','11:00','11:45'),
(2,2,1,'Thursday','12:00','12:45'),
(3,3,2,'Sunday','07:00','07:45'),
(3,1,1,'Sunday','07:45','08:30'),
(3,2,3,'Sunday','08:30','09:15'),
(3,3,2,'Sunday','09:30','10:15'),
(3,1,1,'Sunday','10:15','11:00'),
(3,2,3,'Sunday','11:00','11:45'),
(3,3,2,'Sunday','12:00','12:45'),
(3,2,3,'Monday','07:00','07:45'),
(3,3,2,'Monday','07:45','08:30'),
(3,1,1,'Monday','08:30','09:15'),
(3,2,3,'Monday','09:30','10:15'),
(3,3,2,'Monday','10:15','11:00'),
(3,1,1,'Monday','11:00','11:45'),
(3,2,3,'Monday','12:00','12:45'),
(3,1,1,'Tuesday','07:00','07:45'),
(3,2,3,'Tuesday','07:45','08:30'),
(3,3,2,'Tuesday','08:30','09:15'),
(3,1,1,'Tuesday','09:30','10:15'),
(3,2,3,'Tuesday','10:15','11:00'),
(3,3,2,'Tuesday','11:00','11:45'),
(3,1,1,'Tuesday','12:00','12:45'),
(3,3,2,'Wednesday','07:00','07:45'),
(3,1,1,'Wednesday','07:45','08:30'),
(3,2,3,'Wednesday','08:30','09:15'),
(3,3,2,'Wednesday','09:30','10:15'),
(3,1,1,'Wednesday','10:15','11:00'),
(3,2,3,'Wednesday','11:00','11:45'),
(3,3,2,'Wednesday','12:00','12:45'),
(3,2,3,'Thursday','07:00','07:45'),
(3,3,2,'Thursday','07:45','08:30'),
(3,1,1,'Thursday','08:30','09:15'),
(3,2,3,'Thursday','09:30','10:15'),
(3,3,2,'Thursday','10:15','11:00'),
(3,1,1,'Thursday','11:00','11:45'),
(3,2,3,'Thursday','12:00','12:45');


/* ============================================================
KPI DOMAINS TABLE - Teaching Evaluation Framework
============================================================ */

CREATE TABLE kpi_domains (
    domain_id SERIAL PRIMARY KEY,
    domain_code VARCHAR(20) NOT NULL UNIQUE,
    domain_name VARCHAR(255) NOT NULL,
    domain_description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


/* ============================================================
KPI DOMAINS - INSERT DATA
============================================================ */

INSERT INTO kpi_domains (domain_code, domain_name, domain_description, sort_order) 
VALUES 
    ('D1', 'إعداد وتنفيذ خطة التعلم داخل الحصة', 'Planning and implementing learning strategies within the classroom session', 1),
    ('D2', 'تنوع استراتيجيات التدريس', 'Diversity of teaching strategies and methods', 2),
    ('D3', 'تهيئة البيئة التعليمية', 'Preparing and organizing the educational environment', 3),
    ('D4', 'الإدارة الصفية', 'Classroom management and organization', 4),
    ('D5', 'تنوع أساليب التقويم داخل الحصة', 'Diversity of assessment methods within the session', 5),
    ('D6', 'تحليل مشاركات الطلاب وتشخيص مستوياتهم', 'Analyzing student participation and diagnosing their levels', 6),
    ('D7', 'توظيف تقنيات ووسائل التعلم المناسبة', 'Utilizing appropriate learning technologies and tools', 7),
    ('D8', 'تحسين نتائج المتعلمين', 'Improving learner outcomes and achievement', 8)
ON CONFLICT (domain_code) DO NOTHING;
