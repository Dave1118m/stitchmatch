const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const newContent = 'DATABASE_URL=sqlserver://localhost/tailordb?instanceName=DAVEMIHRETE&integratedSecurity=true&trustServerCertificate=true';

fs.writeFileSync(envPath, newContent);
console.log('.env file rewritten with:', newContent);
