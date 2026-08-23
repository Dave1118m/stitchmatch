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


const cnfPath = path.join(certsDir, 'openssl.cnf');
const keyPath = path.join(certsDir, 'key.pem');
const certPath = path.join(certsDir, 'cert.pem');

const cnfContent = `[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = req_distinguished_name
req_extensions = req_ext
x509_extensions = v3_ca

[req_distinguished_name]
C = US
ST = Local
L = Local
O = StitchMatch Dev
OU = Engineering
CN = localhost

[req_ext]
subjectAltName = @alt_names

[v3_ca]
subjectAltName = @alt_names
basicConstraints = critical, CA:true
keyUsage = critical, digitalSignature, keyEncipherment, keyCertSign
extendedKeyUsage = serverAuth, clientAuth

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
`;

fs.writeFileSync(cnfPath, cnfContent, 'utf-8');

// Search for OpenSSL binary
const opensslCandidates = [
  'openssl',
  'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
  'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe',
];

let opensslCmd = null;
for (const cand of opensslCandidates) {
  try {
    execSync(`"${cand}" version`, { stdio: 'ignore' });
    opensslCmd = `"${cand}"`;
    break;
  } catch (err) {
    // try next
  }
}

if (!opensslCmd) {
  console.error('❌ OpenSSL executable not found. Please install OpenSSL or Git for Windows.');
  process.exit(1);
}

console.log('🔐 Generating SSL digital certificates for localhost & 127.0.0.1...');
const cmd = `${opensslCmd} req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -config "${cnfPath}"`;
execSync(cmd, { stdio: 'inherit' });
console.log('✅ SSL digital certificates successfully generated in:', certsDir);
