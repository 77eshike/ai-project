try {
  const { PrismaClient } = require('@prisma/client');
  const bcrypt = require('bcryptjs');
  console.log('Dependencies loaded successfully');
} catch (error) {
  console.error('Dependency error:', error.message);
}
