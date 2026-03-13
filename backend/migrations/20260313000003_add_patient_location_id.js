/**
 * Migration 3: Add location_id to patients
 * Enables multi-clinic tenancy by associating each patient record
 * with the clinic location that owns it.
 */

export const up = (pgm) => {
  pgm.sql(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS location_id VARCHAR(100);`);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TABLE patients DROP COLUMN IF EXISTS location_id;`);
};
