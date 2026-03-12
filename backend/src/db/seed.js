import pool from './pool.js';
import bcrypt from 'bcryptjs';

const seedDatabase = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Seeding database...');
    
    await client.query('BEGIN');
    
    // Clear existing data (in reverse order of dependencies)
    await client.query('DELETE FROM photos');
    await client.query('DELETE FROM lesions');
    await client.query('DELETE FROM visits');
    await client.query('DELETE FROM patients');
    await client.query('DELETE FROM sync_log');
    await client.query('DELETE FROM users');
    
    console.log('✓ Cleared existing data');
    
    // Insert demo users
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    const users = [
      { id: 'ma-001', name: 'Alex Johnson', email: 'alex.ma@dermmap.com', role: 'ma' },
      { id: 'ma-002', name: 'Jamie Williams', email: 'jamie.ma@dermmap.com', role: 'ma' },
      { id: 'dr-001', name: 'Dr. Sarah Mitchell', email: 'sarah.dr@dermmap.com', role: 'provider' },
      { id: 'dr-002', name: 'Dr. Michael Lee', email: 'michael.dr@dermmap.com', role: 'provider' },
      { id: 'mgr-001', name: 'Taylor Rodriguez', email: 'taylor.mgr@dermmap.com', role: 'manager' },
    ];
    
    for (const user of users) {
      await client.query(
        `INSERT INTO users (id, name, email, password_hash, role) 
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, user.name, user.email, hashedPassword, user.role]
      );
    }
    
    console.log('✓ Inserted users (password: demo123)');
    
    // Insert demo patients
    const patients = [
      {
        patient_id: 'pt-001',
        mrn: 'MRN-204819',
        first_name: 'Margaret',
        last_name: 'Chen',
        date_of_birth: '1962-04-15',
        sex: 'female',
        phone: '(555) 234-5678',
        email: 'margaret.chen@email.com',
        skin_type: 3,
        allergies: 'Penicillin',
        skin_cancer_history: 'Basal cell carcinoma (2019)',
        family_history: 'Mother: melanoma',
        risk_score: 75,
        total_lesions: 4,
        biopsies_performed: 2,
        cancers_detected: 1,
        last_visit: '2026-02-28',
        tags: ['high_risk', 'family_history']
      },
      {
        patient_id: 'pt-002',
        mrn: 'MRN-308721',
        first_name: 'David',
        last_name: 'Thompson',
        date_of_birth: '1978-11-22',
        sex: 'male',
        phone: '(555) 876-5432',
        email: 'david.thompson@email.com',
        skin_type: 2,
        allergies: null,
        skin_cancer_history: null,
        family_history: 'None reported',
        risk_score: 45,
        total_lesions: 3,
        biopsies_performed: 0,
        cancers_detected: 0,
        last_visit: '2026-02-15',
        tags: ['routine_screening']
      },
      {
        patient_id: 'pt-003',
        mrn: 'MRN-412093',
        first_name: 'Lisa',
        last_name: 'Williams',
        date_of_birth: '1985-06-08',
        sex: 'female',
        phone: '(555) 345-6789',
        email: 'lisa.williams@email.com',
        skin_type: 1,
        allergies: 'Sulfa drugs',
        skin_cancer_history: null,
        family_history: 'Father: basal cell carcinoma',
        risk_score: 65,
        total_lesions: 5,
        biopsies_performed: 1,
        cancers_detected: 0,
        last_visit: '2026-03-05',
        next_appointment: '2026-09-05',
        tags: ['high_risk', 'fair_skin']
      }
    ];
    
    for (const patient of patients) {
      await client.query(
        `INSERT INTO patients (
          patient_id, mrn, first_name, last_name, date_of_birth, sex, phone, email,
          skin_type, allergies, skin_cancer_history, family_history, risk_score,
          total_lesions, biopsies_performed, cancers_detected, last_visit, next_appointment, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          patient.patient_id, patient.mrn, patient.first_name, patient.last_name,
          patient.date_of_birth, patient.sex, patient.phone, patient.email,
          patient.skin_type, patient.allergies, patient.skin_cancer_history,
          patient.family_history, patient.risk_score, patient.total_lesions,
          patient.biopsies_performed, patient.cancers_detected, patient.last_visit,
          patient.next_appointment || null, patient.tags
        ]
      );
    }
    
    console.log('✓ Inserted patients');
    
    // Insert demo visits
    const visits = [
      {
        visit_id: 'v-001-1',
        patient_id: 'pt-001',
        visit_date: '2026-02-28T09:00:00Z',
        visit_type: 'routine_screening',
        status: 'locked',
        chief_complaint: 'Annual skin check',
        ma_id: 'ma-001',
        ma_name: 'Alex Johnson',
        provider_id: 'dr-001',
        provider_name: 'Dr. Sarah Mitchell',
        created_by: 'ma-001'
      },
      {
        visit_id: 'v-002-1',
        patient_id: 'pt-002',
        visit_date: '2026-02-15T14:00:00Z',
        visit_type: 'routine_screening',
        status: 'locked',
        chief_complaint: 'Full body skin check',
        ma_id: 'ma-001',
        ma_name: 'Alex Johnson',
        provider_id: 'dr-001',
        provider_name: 'Dr. Sarah Mitchell',
        created_by: 'ma-001'
      },
      {
        visit_id: 'v-003-1',
        patient_id: 'pt-003',
        visit_date: '2026-03-05T10:30:00Z',
        visit_type: 'follow_up',
        status: 'signed',
        chief_complaint: 'Follow-up on back lesion',
        ma_id: 'ma-002',
        ma_name: 'Jamie Williams',
        provider_id: 'dr-002',
        provider_name: 'Dr. Michael Lee',
        created_by: 'ma-002'
      }
    ];
    
    for (const visit of visits) {
      await client.query(
        `INSERT INTO visits (
          visit_id, patient_id, visit_date, visit_type, status, chief_complaint,
          ma_id, ma_name, provider_id, provider_name, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          visit.visit_id, visit.patient_id, visit.visit_date, visit.visit_type,
          visit.status, visit.chief_complaint, visit.ma_id, visit.ma_name,
          visit.provider_id, visit.provider_name, visit.created_by
        ]
      );
    }
    
    console.log('✓ Inserted visits');
    
    // Insert demo lesions
    const lesions = [
      {
        lesion_id: 'l-001-1-1',
        visit_id: 'v-001-1',
        patient_id: 'pt-001',
        body_location_x: 80,
        body_location_y: 140,
        body_region: 'chest',
        body_view: 'anterior',
        size_mm: 6.0,
        shape: 'irregular',
        color: 'dark_brown',
        border: 'irregular',
        symmetry: 'asymmetric',
        action: 'biopsy_performed',
        clinical_notes: 'Asymmetric lesion with irregular border. ABCDE criteria met.',
        biopsy_result: 'atypical',
        pathology_notes: 'Moderately dysplastic nevus. Recommend excision with 5mm margin.',
        created_by: 'ma-001'
      },
      {
        lesion_id: 'l-001-1-2',
        visit_id: 'v-001-1',
        patient_id: 'pt-001',
        body_location_x: 100,
        body_location_y: 200,
        body_region: 'abdomen',
        body_view: 'anterior',
        size_mm: 3.0,
        shape: 'round',
        color: 'brown',
        border: 'regular',
        symmetry: 'symmetric',
        action: 'monitor',
        clinical_notes: 'Benign-appearing compound nevus. Monitor at next visit.',
        biopsy_result: 'na',
        pathology_notes: '',
        created_by: 'ma-001'
      },
      {
        lesion_id: 'l-002-1-1',
        visit_id: 'v-002-1',
        patient_id: 'pt-002',
        body_location_x: 162,
        body_location_y: 160,
        body_region: 'right_upper_arm',
        body_view: 'anterior',
        size_mm: 4.5,
        shape: 'oval',
        color: 'light_brown',
        border: 'regular',
        symmetry: 'symmetric',
        action: 'monitor',
        clinical_notes: 'Stable seborrheic keratosis. No changes from previous visit.',
        biopsy_result: 'na',
        pathology_notes: '',
        created_by: 'ma-001'
      }
    ];
    
    for (const lesion of lesions) {
      await client.query(
        `INSERT INTO lesions (
          lesion_id, visit_id, patient_id, body_location_x, body_location_y, body_region,
          body_view, size_mm, shape, color, border, symmetry, action, clinical_notes,
          biopsy_result, pathology_notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          lesion.lesion_id, lesion.visit_id, lesion.patient_id, lesion.body_location_x,
          lesion.body_location_y, lesion.body_region, lesion.body_view, lesion.size_mm,
          lesion.shape, lesion.color, lesion.border, lesion.symmetry, lesion.action,
          lesion.clinical_notes, lesion.biopsy_result, lesion.pathology_notes, lesion.created_by
        ]
      );
    }
    
    console.log('✓ Inserted lesions');
    console.log('\n✓ Database seeded successfully!');
    console.log('\nDemo Users:');
    console.log('  MA: alex.ma@dermmap.com / demo123');
    console.log('  Provider: sarah.dr@dermmap.com / demo123');
    console.log('  Manager: taylor.mgr@dermmap.com / demo123');
    
    await client.query('COMMIT');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log('\nDatabase seed complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database seed failed:', error);
      process.exit(1);
    });
}

export default seedDatabase;
