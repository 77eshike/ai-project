try {
  const { authOptions } = require('../../lib/auth');
  console.log('Import successful:', authOptions ? 'Yes' : 'No');
} catch (error) {
  console.error('Import failed:', error.message);
}
