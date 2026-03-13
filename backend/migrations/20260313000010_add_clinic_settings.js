/**
 * Migration 10: Add clinic_settings table (Issue 26)
 * Key/value store for per-clinic configuration (e.g. feature flags, preferences).
 * This table was previously created at runtime inside the settings route — moved
 * here so all DDL is version-controlled and executed at deploy time only.
 */

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS clinic_settings (
      key   VARCHAR(120) PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS clinic_settings;`);
};
