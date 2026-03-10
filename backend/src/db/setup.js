import pool from './pool.js';

const setupDatabase = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Creating database schema...');
    
    // Enable UUID extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('ma', 'provider', 'manager', 'admin')),
        credentials VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration: add new user columns to existing installs
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS credentials VARCHAR(100);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive'));`).catch(() => {});
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;`);
    
    // Patients table
    await client.query(`
      CREATE TABLE IF NOT EXISTS patients (
        patient_id VARCHAR(100) PRIMARY KEY,
        mrn VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        date_of_birth DATE NOT NULL,
        sex VARCHAR(10) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        address_street VARCHAR(255),
        address_city VARCHAR(100),
        address_state VARCHAR(50),
        address_zip VARCHAR(20),
        insurance_provider VARCHAR(100),
        insurance_member_id VARCHAR(100),
        insurance_group_id VARCHAR(100),
        emergency_contact_name VARCHAR(255),
        emergency_contact_phone VARCHAR(20),
        emergency_contact_relationship VARCHAR(50),
        skin_type INTEGER,
        allergies TEXT,
        skin_cancer_history TEXT,
        family_history TEXT,
        risk_score INTEGER,
        total_lesions INTEGER DEFAULT 0,
        biopsies_performed INTEGER DEFAULT 0,
        cancers_detected INTEGER DEFAULT 0,
        last_visit DATE,
        next_appointment DATE,
        tags TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Visits table
    await client.query(`
      CREATE TABLE IF NOT EXISTS visits (
        visit_id VARCHAR(100) PRIMARY KEY,
        patient_id VARCHAR(100) REFERENCES patients(patient_id) ON DELETE CASCADE,
        visit_date TIMESTAMP NOT NULL,
        visit_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('in_progress', 'pending_review', 'signed', 'locked')),
        chief_complaint TEXT,
        ma_id VARCHAR(100) REFERENCES users(id),
        ma_name VARCHAR(255),
        provider_id VARCHAR(100) REFERENCES users(id),
        provider_name VARCHAR(255),
        provider_attestation TEXT,
        created_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      );
    `);
    
    // Lesions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS lesions (
        lesion_id VARCHAR(100) PRIMARY KEY,
        visit_id VARCHAR(100) REFERENCES visits(visit_id) ON DELETE CASCADE,
        patient_id VARCHAR(100) REFERENCES patients(patient_id) ON DELETE CASCADE,
        body_location_x INTEGER NOT NULL,
        body_location_y INTEGER NOT NULL,
        body_region VARCHAR(50) NOT NULL,
        body_view VARCHAR(20) NOT NULL CHECK (body_view IN ('anterior', 'posterior')),
        size_mm NUMERIC(5,2) NOT NULL,
        shape VARCHAR(50) NOT NULL,
        color VARCHAR(50) NOT NULL,
        border VARCHAR(50) NOT NULL,
        symmetry VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        clinical_notes TEXT,
        biopsy_result VARCHAR(50),
        pathology_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        previous_lesion_id VARCHAR(100) REFERENCES lesions(lesion_id)
      );
    `);
    
    // Photos table (BLOBs for image storage)
    await client.query(`
      CREATE TABLE IF NOT EXISTS photos (
        photo_id VARCHAR(100) PRIMARY KEY,
        lesion_id VARCHAR(100) REFERENCES lesions(lesion_id) ON DELETE CASCADE,
        visit_id VARCHAR(100) REFERENCES visits(visit_id) ON DELETE CASCADE,
        photo_data BYTEA NOT NULL,
        photo_type VARCHAR(20) NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100) NOT NULL
      );
    `);
    
    // Audit log table (HIPAA-required immutable event log)
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        log_id VARCHAR(100) PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user_id VARCHAR(100) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_role VARCHAR(20) NOT NULL,
        action_type VARCHAR(20) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        device_id VARCHAR(255)
      );
    `);

    // Sync log table (for offline sync tracking)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_log (
        sync_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id VARCHAR(100) REFERENCES users(id),
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100) NOT NULL,
        operation VARCHAR(20) NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        client_timestamp TIMESTAMP,
        conflict_resolved BOOLEAN DEFAULT FALSE
      );
    `);
    
    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id);
      CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
      CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);
      CREATE INDEX IF NOT EXISTS idx_lesions_visit_id ON lesions(visit_id);
      CREATE INDEX IF NOT EXISTS idx_lesions_patient_id ON lesions(patient_id);
      CREATE INDEX IF NOT EXISTS idx_photos_lesion_id ON photos(lesion_id);
      CREATE INDEX IF NOT EXISTS idx_sync_log_user_id ON sync_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_sync_log_entity ON sync_log(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    `);
    
    console.log('✓ Database schema created successfully');
    
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase()
    .then(() => {
      console.log('Database setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}

export default setupDatabase;
