import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fluent_financial_flow',
  port: process.env.DB_PORT || 3306
};

async function createAdminUser() {
  let connection;
  
  try {
    console.log('🔧 Creating admin user...');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Generate password hash for 'admin123'
    const password = 'admin123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    console.log('✅ Password hash generated');
    console.log('Password:', password);
    console.log('Hash:', passwordHash);
    
    // Check if admin user exists
    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      ['admin@accuflow.com']
    );
    
    if (existingUsers.length > 0) {
      // Update existing admin user
      await connection.query(
        'UPDATE users SET password_hash = ?, is_verified = TRUE, is_active = TRUE WHERE email = ?',
        [passwordHash, 'admin@accuflow.com']
      );
      console.log('✅ Admin user updated');
    } else {
      // Insert new admin user
      await connection.query(
        'INSERT INTO users (first_name, last_name, email, password_hash, company, role, is_verified, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['Admin', 'User', 'admin@accuflow.com', passwordHash, 'AccuFlow', 'admin', TRUE, TRUE]
      );
      console.log('✅ Admin user created');
    }
    
    // Verify the user was created/updated
    const [users] = await connection.query(
      'SELECT id, email, role, is_verified, is_active FROM users WHERE email = ?',
      ['admin@accuflow.com']
    );
    
    if (users.length > 0) {
      const user = users[0];
      console.log('✅ Admin user verified:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Verified: ${user.is_verified}`);
      console.log(`   Active: ${user.is_active}`);
    }
    
    console.log('🎉 Admin user setup completed!');
    console.log('📧 Login with: admin@accuflow.com / admin123');
    
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createAdminUser(); 