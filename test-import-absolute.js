try {
  const { authOptions } = require('/opt/ai-project/src/lib/auth');
  console.log('Import successful:', authOptions ? 'Yes' : 'No');
} catch (error) {
  console.error('Import failed:', error.message);
  console.error('Error details:', error);
}
