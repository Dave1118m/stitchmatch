const { execSync } = require('child_process');

console.log('Removing Prisma client cache...');
try {
  execSync('rmdir /S /Q node_modules\\.prisma', { cwd: __dirname });
  console.log('Prisma cache removed');
} catch (e) {
  console.log('Cache removal failed or already clean');
}

console.log('Regenerating Prisma client...');
try {
  execSync('npx prisma generate', { cwd: __dirname, stdio: 'inherit' });
  console.log('Prisma client regenerated');
} catch (e) {
  console.log('Prisma generation failed');
}
