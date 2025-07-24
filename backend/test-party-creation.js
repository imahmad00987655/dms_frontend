import mysql from 'mysql2/promise';
import { dbConfig } from './config/database.js';

// Helper function to get next sequence value
const getNextSequenceValue = async (connection, sequenceName) => {
  const [seqResult] = await connection.execute(
    'SELECT current_value FROM ar_sequences WHERE sequence_name = ?',
    [sequenceName]
  );
  
  if (seqResult.length === 0) {
    throw new Error(`Sequence ${sequenceName} not found`);
  }
  
  const currentValue = seqResult[0].current_value;
  
  // Update sequence for next use
  await connection.execute(
    'UPDATE ar_sequences SET current_value = current_value + 1 WHERE sequence_name = ?',
    [sequenceName]
  );
  
  return currentValue;
};

async function testPartyCreation() {
  try {
    console.log('Testing party creation...');
    const connection = await mysql.createConnection(dbConfig);
    
    // Test sequence
    console.log('1. Testing sequence...');
    const partyId = await getNextSequenceValue(connection, 'HZ_PARTY_ID_SEQ');
    console.log('Party ID:', partyId);
    
    // Generate party number
    const partyNumber = `P${partyId.toString().padStart(6, '0')}`;
    console.log('Party Number:', partyNumber);
    
    // Test data
    const partyData = {
      party_name: 'Test Party',
      party_type: 'ORGANIZATION',
      tax_id: '123',
      website: 'http://test.com',
      industry: 'Test',
      status: 'ACTIVE'
    };
    
    console.log('2. Testing INSERT...');
    console.log('Party data:', partyData);
    
    // Check table structure
    console.log('3. Checking table structure...');
    const [columns] = await connection.execute('DESCRIBE hz_parties');
    console.log('Table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Try the INSERT
    console.log('4. Attempting INSERT...');
    await connection.execute(`
      INSERT INTO hz_parties (
        party_id, party_number, party_name, party_type, 
        tax_id, website, industry, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [partyId, partyNumber, partyData.party_name, partyData.party_type, 
        partyData.tax_id, partyData.website, partyData.industry, partyData.status]);
    
    console.log('✅ Party created successfully!');
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testPartyCreation(); 