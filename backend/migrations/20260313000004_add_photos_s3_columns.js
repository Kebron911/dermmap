/**
 * Migration 4: Add cloud storage and metadata columns to photos
 * Extends the photos table to support:
 *   - S3/GCS/Azure Blob cloud object storage (Option A)
 *   - BYTEA binary storage for development / small deployments (Option B)
 *   - Capture metadata: type, dimensions
 * Also relaxes NOT NULL on storage columns so that BYTEA-only inserts succeed
 * in deployments that do not use cloud storage.
 */

export const up = (pgm) => {
  // Cloud storage columns (Option A)
  pgm.sql(`ALTER TABLE photos ADD COLUMN IF NOT EXISTS storage_key         TEXT;`);
  pgm.sql(`ALTER TABLE photos ADD COLUMN IF NOT EXISTS storage_bucket      TEXT DEFAULT 'dermmap-photos';`);
  pgm.sql(`ALTER TABLE photos ADD COLUMN IF NOT EXISTS signed_url          TEXT;`);
  pgm.sql(`ALTER TABLE photos ADD COLUMN IF NOT EXISTS signed_url_expires_at TIMESTAMP;`);

  // Capture metadata
  pgm.sql(`ALTER TABLE photos ADD COLUMN IF NOT EXISTS capture_type VARCHAR(20);`);
  pgm.sql(`ALTER TABLE photos ADD COLUMN IF NOT EXISTS width_px     INTEGER;`);
  pgm.sql(`ALTER TABLE photos ADD COLUMN IF NOT EXISTS height_px    INTEGER;`);

  // Binary storage (Option B — development / small deployments)
  pgm.sql(`ALTER TABLE photos ADD COLUMN IF NOT EXISTS photo_data   BYTEA;`);

  // Allow either storage strategy: drop NOT NULL from cloud-only columns
  pgm.sql(`ALTER TABLE photos ALTER COLUMN storage_key    DROP NOT NULL;`);
  pgm.sql(`ALTER TABLE photos ALTER COLUMN storage_bucket DROP NOT NULL;`);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TABLE photos DROP COLUMN IF EXISTS photo_data;`);
  pgm.sql(`ALTER TABLE photos DROP COLUMN IF EXISTS height_px;`);
  pgm.sql(`ALTER TABLE photos DROP COLUMN IF EXISTS width_px;`);
  pgm.sql(`ALTER TABLE photos DROP COLUMN IF EXISTS capture_type;`);
  pgm.sql(`ALTER TABLE photos DROP COLUMN IF EXISTS signed_url_expires_at;`);
  pgm.sql(`ALTER TABLE photos DROP COLUMN IF EXISTS signed_url;`);
  pgm.sql(`ALTER TABLE photos DROP COLUMN IF EXISTS storage_bucket;`);
  pgm.sql(`ALTER TABLE photos DROP COLUMN IF EXISTS storage_key;`);
};
