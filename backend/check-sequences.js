import mysql from 'mysql2/promise';
import { dbConfig } from './config/database.js';

async function checkSequences() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    console.log('Checking sequences...');
    const [sequences] = await connection.execute('SELECT * FROM ar_sequences WHERE sequence_name LIKE "HZ%"');
    
    console.log('HZ Sequences found:');
    sequences.forEach(seq => {
      console.log(`- ${seq.sequence_name}: ${seq.current_value}`);
    });
    
    await connection.end();
  } catch (error) {
    console.error('Error checking sequences:', error);
  }
}

checkSequences(); 