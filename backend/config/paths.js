import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root backup directory placed OUTSIDE the project workspace directory
// Customizable in .env via BACKUP_DIR=/path/to/external/backups
const rootBackupDir = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.resolve(__dirname, '..', '..', '..', 'AgenticAi_event_backups');

export const BACKUP_DIR = rootBackupDir;
export const BACKUP_DB_DIR = path.join(rootBackupDir, 'db');
export const BACKUP_POSTERS_DIR = path.join(rootBackupDir, 'posters');
