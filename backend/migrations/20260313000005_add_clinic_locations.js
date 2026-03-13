/**
 * Migration 5: Add clinic_locations table
 * Represents a single physical practice or office location.
 * Patients, users, and visits are scoped to a location_id for multi-tenancy.
 */

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS clinic_locations (
      location_id    VARCHAR(100) PRIMARY KEY,
      name           VARCHAR(255) NOT NULL,
      npi            VARCHAR(20)  NOT NULL,
      address_street VARCHAR(255),
      address_city   VARCHAR(100),
      address_state  VARCHAR(50),
      address_zip    VARCHAR(20),
      phone          VARCHAR(30),
      email          VARCHAR(255),
      status         VARCHAR(20)  NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'active', 'suspended')),
      created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      activated_at   TIMESTAMP
    );
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS clinic_locations;`);
};
