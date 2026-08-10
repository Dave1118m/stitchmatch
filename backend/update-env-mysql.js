const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
// MySQL connection string format
const newContent = 'DATABASE_URL="mysql://root:mysql@localhost:3306/tailordb"';

fs.writeFileSync(envPath, newContent);
console.log('.env file updated with MySQL connection string:', newContent);
