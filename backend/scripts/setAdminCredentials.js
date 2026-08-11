import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function run() {
  let username = process.argv[2];
  let password = process.argv[3];

  console.log('\n=============================================');
  console.log('       ADMIN CREDENTIALS CONFIGURATOR       ');
  console.log('=============================================\n');

  if (!username) {
    username = await askQuestion('Enter New Admin Username: ');
  }

  if (!password) {
    password = await askQuestion('Enter New Admin Password: ');
  }

  if (!username || !password) {
    console.error('❌ Error: Both Username and Password are required!');
    process.exit(1);
  }

  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  const envLines = envContent.split(/\r?\n/);
  let hasUser = false;
  let hasPass = false;

  const newLines = envLines.map((line) => {
    if (line.startsWith('ADMIN_USERNAME=')) {
      hasUser = true;
      return `ADMIN_USERNAME=${username}`;
    }
    if (line.startsWith('ADMIN_PASSWORD=')) {
      hasPass = true;
      return `ADMIN_PASSWORD=${password}`;
    }
    return line;
  });

  if (!hasUser) {
    newLines.push(`ADMIN_USERNAME=${username}`);
  }
  if (!hasPass) {
    newLines.push(`ADMIN_PASSWORD=${password}`);
  }

  fs.writeFileSync(envPath, newLines.filter(Boolean).join('\n') + '\n', 'utf8');

  console.log('\n=============================================');
  console.log('✅ Admin Credentials Updated Successfully!');
  console.log(`👤 Username : ${username}`);
  console.log(`🔑 Password : ${'*'.repeat(password.length)} (${password})`);
  console.log(`📁 File     : ${envPath}`);
  console.log('=============================================\n');
}

run().catch((err) => {
  console.error('❌ Error updating admin credentials:', err);
  process.exit(1);
});
