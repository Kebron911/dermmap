/**
 * Migration 6: Add baa_records table
 * Immutable log of every signed Business Associate Agreement (BAA).
 * HIPAA §164.308(b)(1) — required before sharing ePHI with a business associate.
 */

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS baa_records (
      id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
      location_id           VARCHAR(100) REFERENCES clinic_locations(location_id),
      admin_email           VARCHAR(255) NOT NULL,
      admin_name            VARCHAR(255) NOT NULL,
      agreement_version     VARCHAR(10)  NOT NULL DEFAULT '1.0',
      ip_address            VARCHAR(45),
      user_agent            TEXT,
      signed_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      docusign_envelope_id  VARCHAR(100)
    );
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS baa_records;`);
};
