/* ============================================================
   FIRASAAI DATABASE CORE STRUCTURE
   Fixed version: removed unsupported GENERATED column subquery
   and fixed INSERT school_code reference.
============================================================ */

-- schools
CREATE TABLE IF NOT EXISTS schools (
    school_id SERIAL PRIMARY KEY,
    school_name VARCHAR(200) NOT NULL,
    school_code VARCHAR(50),
    city VARCHAR(100),
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- grades
CREATE TABLE IF NOT EXISTS grades (
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

-- sections
CREATE TABLE IF NOT EXISTS sections (
    section_id SERIAL PRIMARY KEY,
    section_name VARCHAR(10) NOT NULL UNIQUE
);

-- classes (removed GENERATED ALWAYS AS subquery — not supported in PostgreSQL)
CREATE TABLE IF NOT EXISTS classes (
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

-- subjects
CREATE TABLE IF NOT EXISTS subjects (
    subject_id SERIAL PRIMARY KEY,
    subject_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- teachers
CREATE TABLE IF NOT EXISTS teachers (
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

-- section_time_slots
CREATE TABLE IF NOT EXISTS section_time_slots (
    time_slot_id SERIAL PRIMARY KEY,
    class_id INT NOT NULL,
    subject_id INT NOT NULL,
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

-- class_schedule
CREATE TABLE IF NOT EXISTS class_schedule (
    schedule_id SERIAL PRIMARY KEY,
    class_id INT NOT NULL,
    subject_id INT NOT NULL,
    teacher_id INT NOT NULL,
    time_slot_id INT NOT NULL,

    CONSTRAINT fk_schedule_class
        FOREIGN KEY (class_id)
        REFERENCES classes(class_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_schedule_subject
        FOREIGN KEY (subject_id)
        REFERENCES subjects(subject_id),

    CONSTRAINT fk_schedule_teacher
        FOREIGN KEY (teacher_id)
        REFERENCES teachers(teacher_id),

    CONSTRAINT fk_schedule_timeslot
        FOREIGN KEY (time_slot_id)
        REFERENCES section_time_slots(time_slot_id),

    CONSTRAINT uq_class_timeslot
        UNIQUE (class_id, time_slot_id)
);


/* ============================================================
   SAMPLE DATA
============================================================ */

-- Schools
INSERT INTO schools (school_name, school_code, city, country)
VALUES ('Riyadh International School','RIS01','Riyadh','Saudi Arabia')
ON CONFLICT DO NOTHING;

-- Grades
INSERT INTO grades (school_id, grade_name, grade_level)
VALUES (1,'Grade 5',5), (1,'Grade 6',6)
ON CONFLICT DO NOTHING;

-- Sections
INSERT INTO sections (section_name)
VALUES ('A'), ('B'), ('C')
ON CONFLICT DO NOTHING;

-- Classes (Grade + Section) and auto-generate class_name
INSERT INTO classes (grade_id, section_id, class_name)
VALUES
  (2, 1, 'Grade 6 - A'),
  (2, 2, 'Grade 6 - B'),
  (1, 1, 'Grade 5 - A')
ON CONFLICT DO NOTHING;

-- Subjects
INSERT INTO subjects (subject_name)
VALUES ('Mathematics'), ('Science'), ('English')
ON CONFLICT DO NOTHING;

-- Teachers
INSERT INTO teachers (school_id, teacher_name, teacher_email, teacher_phone)
VALUES
  (1,'Ahmed Al-Harbi','ahmed.harbi@school.com','0501111111'),
  (1,'Sara Khan','sara.khan@school.com','0502222222'),
  (1,'John Smith','john.smith@school.com','0503333333')
ON CONFLICT DO NOTHING;

-- Time Slots
INSERT INTO section_time_slots (class_id, subject_id, day_of_week, start_time, end_time)
VALUES
  (1,1,'Sunday','07:00','08:00'),
  (1,2,'Sunday','08:00','09:00'),
  (1,3,'Monday','07:00','08:00'),
  (2,1,'Sunday','07:00','08:00')
ON CONFLICT DO NOTHING;

-- Class Schedule
INSERT INTO class_schedule (class_id, subject_id, teacher_id, time_slot_id)
VALUES
  (1,1,1,1),
  (1,2,2,2),
  (1,3,3,3),
  (2,1,1,4)
ON CONFLICT DO NOTHING;
