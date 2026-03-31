/**
 * Migration: Rename primary key columns from `id` to `<table>_id`
 *
 * Tables affected:
 *   users.id        → users.user_id
 *   evidences.id    → evidences.evidence_id
 *   evaluations.id  → evaluations.evaluation_id
 *   lecture.id      → lecture.lecture_id
 *   fragments.id    → fragments.fragment_id
 *
 * Foreign keys updated:
 *   fragments.lecture_id  → references lecture(lecture_id)
 *   evidences.fragment_id → references fragments(fragment_id)
 *
 * The aggregation function (run_evaluation_aggregation_job) references the old
 * column names inside its body, so it must be dropped before the rename and
 * recreated afterwards by the application (ensureAggregationFunctionForCurrentDb).
 */

import { executeQuery } from '../helpers/database.js';

export const renamePrimaryKeys = async () => {
  console.log('🔄 Renaming primary key columns...');

  // ------------------------------------------------------------------
  // Helper: rename a column only if the old name still exists
  // (makes the migration idempotent)
  // ------------------------------------------------------------------
  const renameColumnIfExists = async (
    table: string,
    oldCol: string,
    newCol: string,
  ) => {
    await executeQuery(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = '${table}' AND column_name = '${oldCol}'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = '${table}' AND column_name = '${newCol}'
        ) THEN
          ALTER TABLE ${table} RENAME COLUMN ${oldCol} TO ${newCol};
        END IF;
      END $$;
    `);
  };

  // ------------------------------------------------------------------
  // 1. Drop the aggregation function so it doesn't block column renames
  //    (it references evidences.id and fragments.id)
  // ------------------------------------------------------------------
  await executeQuery(`
    DROP FUNCTION IF EXISTS public.run_evaluation_aggregation_job();
  `);
  console.log('  ↳ Dropped run_evaluation_aggregation_job (will be recreated by app)');

  // ------------------------------------------------------------------
  // 2. Drop foreign keys that reference columns we are about to rename
  //    so PostgreSQL doesn't prevent the rename.
  // ------------------------------------------------------------------
  await executeQuery(`
    DO $$
    DECLARE
      fk_name TEXT;
    BEGIN
      -- fragments.lecture_id → lecture(id)
      SELECT tc.constraint_name INTO fk_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'fragments'
          AND kcu.column_name = 'lecture_id';
      IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE fragments DROP CONSTRAINT %I', fk_name);
      END IF;

      -- evidences.fragment_id → fragments(id)
      SELECT tc.constraint_name INTO fk_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'evidences'
          AND kcu.column_name = 'fragment_id';
      IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE evidences DROP CONSTRAINT %I', fk_name);
      END IF;
    END $$;
  `);
  console.log('  ↳ Dropped FK constraints that reference columns being renamed');

  // ------------------------------------------------------------------
  // 3. Rename primary key columns
  // ------------------------------------------------------------------
  await renameColumnIfExists('users', 'id', 'user_id');
  console.log('  ↳ users.id → users.user_id');

  await renameColumnIfExists('evidences', 'id', 'evidence_id');
  console.log('  ↳ evidences.id → evidences.evidence_id');

  await renameColumnIfExists('evaluations', 'id', 'evaluation_id');
  console.log('  ↳ evaluations.id → evaluations.evaluation_id');

  await renameColumnIfExists('lecture', 'id', 'lecture_id');
  console.log('  ↳ lecture.id → lecture.lecture_id');

  await renameColumnIfExists('fragments', 'id', 'fragment_id');
  console.log('  ↳ fragments.id → fragments.fragment_id');

  // ------------------------------------------------------------------
  // 4. Re-add foreign keys pointing to the newly renamed columns
  // ------------------------------------------------------------------
  await executeQuery(`
    DO $$
    BEGIN
      -- fragments.lecture_id → lecture(lecture_id)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'fragments'
          AND kcu.column_name = 'lecture_id'
      ) THEN
        ALTER TABLE fragments
          ADD CONSTRAINT fk_fragments_lecture
          FOREIGN KEY (lecture_id) REFERENCES lecture(lecture_id) ON DELETE CASCADE;
      END IF;

      -- evidences.fragment_id → fragments(fragment_id)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'evidences'
          AND kcu.column_name = 'fragment_id'
      ) THEN
        ALTER TABLE evidences
          ADD CONSTRAINT fk_evidences_fragment
          FOREIGN KEY (fragment_id) REFERENCES fragments(fragment_id) ON DELETE CASCADE;
      END IF;
    END $$;
  `);
  console.log('  ↳ Re-created FK constraints referencing renamed columns');

  // ------------------------------------------------------------------
  // 5. Sync sequences to the renamed columns
  // ------------------------------------------------------------------
  await executeQuery(`
    DO $$
    DECLARE
      seq_name TEXT;
    BEGIN
      -- users
      seq_name := pg_get_serial_sequence('users', 'user_id');
      IF seq_name IS NOT NULL THEN
        PERFORM setval(seq_name, COALESCE((SELECT MAX(user_id) FROM users), 0) + 1, false);
      END IF;

      -- evidences
      seq_name := pg_get_serial_sequence('evidences', 'evidence_id');
      IF seq_name IS NOT NULL THEN
        PERFORM setval(seq_name, COALESCE((SELECT MAX(evidence_id) FROM evidences), 0) + 1, false);
      END IF;

      -- evaluations
      seq_name := pg_get_serial_sequence('evaluations', 'evaluation_id');
      IF seq_name IS NOT NULL THEN
        PERFORM setval(seq_name, COALESCE((SELECT MAX(evaluation_id) FROM evaluations), 0) + 1, false);
      END IF;

      -- lecture
      seq_name := pg_get_serial_sequence('lecture', 'lecture_id');
      IF seq_name IS NOT NULL THEN
        PERFORM setval(seq_name, COALESCE((SELECT MAX(lecture_id) FROM lecture), 0) + 1, false);
      END IF;

      -- fragments
      seq_name := pg_get_serial_sequence('fragments', 'fragment_id');
      IF seq_name IS NOT NULL THEN
        PERFORM setval(seq_name, COALESCE((SELECT MAX(fragment_id) FROM fragments), 0) + 1, false);
      END IF;
    END $$;
  `);
  console.log('  ↳ Sequences synced to renamed columns');

  // ------------------------------------------------------------------
  // 6. Update the syncUsersIdSequence helper reference
  //    (the app-level function in authService.ts references 'id';
  //     after this migration it must use 'user_id' — that is a code
  //     change, but we ensure the DB sequence is correct here.)
  // ------------------------------------------------------------------

  console.log('✅ Primary key column rename migration complete');
  console.log('   ⚠  Remember to update syncUsersIdSequence in authService.ts');
  console.log('      to reference "user_id" instead of "id".');
  console.log('   ⚠  run_evaluation_aggregation_job was dropped and will be');
  console.log('      recreated automatically by ensureAggregationFunctionForCurrentDb.');
};
