import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const certsDir = path.join(projectRoot, 'certs');

if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

const caKeyPath = path.join(certsDir, 'ca.key');
const caCertPath = path.join(certsDir, 'ca.crt');
const serverKeyPath = path.join(certsDir, 'key.pem');
const serverCsrPath = path.join(certsDir, 'server.csr');
const serverCertPath = path.join(certsDir, 'cert.pem');
const caCnfPath = path.join(certsDir, 'ca.cnf');
const extCnfPath = path.join(certsDir, 'server_ext.cnf');

// 1. Write CA configuration
const caCnfContent = `[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = ca_dn

[ca_dn]
C = US
ST = State
L = City
O = StitchMatch Local Development CA
OU = Security
CN = StitchMatch Local Root CA
`;
fs.writeFileSync(caCnfPath, caCnfContent, 'utf-8');

// 2. Write Server Extension configuration for SAN
const extCnfContent = `authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
`;
fs.writeFileSync(extCnfPath, extCnfContent, 'utf-8');

// Search for OpenSSL
const opensslCandidates = [
  'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
  'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe',
  'openssl',
];

let opensslCmd = null;
for (const cand of opensslCandidates) {
  try {
    execSync(`"${cand}" version`, { stdio: 'ignore' });
    opensslCmd = `"${cand}"`;
    break;
  } catch (err) {
    // next
  }
}

if (!opensslCmd) {
  console.error('❌ OpenSSL executable not found.');
  process.exit(1);
}

console.log('🔐 [1/4] Generating StitchMatch Root CA...');
execSync(`${opensslCmd} req -x509 -new -nodes -keyout "${caKeyPath}" -out "${caCertPath}" -days 3650 -config "${caCnfPath}"`, { stdio: 'inherit' });

console.log('🔐 [2/4] Generating Server Private Key and CSR...');
execSync(`${opensslCmd} req -new -nodes -out "${serverCsrPath}" -newkey rsa:2048 -keyout "${serverKeyPath}" -subj "/C=US/ST=State/L=City/O=StitchMatch/OU=Engineering/CN=localhost"`, { stdio: 'inherit' });

console.log('🔐 [3/4] Signing Server Certificate with Root CA...');
execSync(`${opensslCmd} x509 -req -in "${serverCsrPath}" -CA "${caCertPath}" -CAkey "${caKeyPath}" -CAcreateserial -out "${serverCertPath}" -days 3650 -extfile "${extCnfPath}"`, { stdio: 'inherit' });

console.log('🔐 [4/4] Installing Root CA into Windows CurrentUser Trusted Root Store...');
try {
  // Use certutil to add ca.crt into user's Trusted Root store
  execSync(`certutil -addstore -user "Root" "${caCertPath}"`, { stdio: 'inherit' });
  console.log('✅ Root CA successfully trusted in Windows certificate store!');
} catch (err) {
  console.warn('⚠️ Could not automatically install certificate via certutil:', err.message);
}

console.log('\n🎉 HTTPS Digital Certificate generation & installation complete!');
console.log('   - Server Certificate: ' + serverCertPath);
console.log('   - Server Private Key: ' + serverKeyPath);
console.log('   - Trusted Root CA:    ' + caCertPath);
