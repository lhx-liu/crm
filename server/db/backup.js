const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, 'backups');
const MAX_BACKUPS = 30;

const DB_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || '3306',
  user: process.env.MYSQL_USER || 'crm_user',
  password: process.env.MYSQL_PASSWORD || 'crm_password_2024',
  database: process.env.MYSQL_DATABASE || 'crm_db',
};

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function generateBackupFileName() {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\..+/, '');
  return `crm_backup_${timestamp}.sql`;
}

async function performBackup() {
  try {
    ensureBackupDir();
    const backupFileName = generateBackupFileName();
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    const cmd = `mysqldump -h${DB_CONFIG.host} -P${DB_CONFIG.port} -u${DB_CONFIG.user} -p${DB_CONFIG.password} ${DB_CONFIG.database} > "${backupPath}"`;
    await execAsync(cmd);

    const stats = fs.statSync(backupPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('✅ 备份成功!');
    console.log(`   文件: ${backupFileName}`);
    console.log(`   大小: ${fileSizeInMB} MB`);

    cleanOldBackups();
    return backupPath;
  } catch (error) {
    console.error('❌ 备份失败:', error.message);
    return null;
  }
}

function cleanOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('crm_backup_') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > MAX_BACKUPS) {
      const filesToDelete = files.slice(MAX_BACKUPS);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️  删除旧备份: ${file.name}`);
      });
    }
  } catch (error) {
    console.error('❌ 清理旧备份失败:', error.message);
  }
}

function listBackups() {
  try {
    ensureBackupDir();
    return fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('crm_backup_') && file.endsWith('.sql'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        return { name: file, size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB', created: stats.mtime };
      })
      .sort((a, b) => b.created - a.created);
  } catch (error) {
    console.error('❌ 获取备份列表失败:', error.message);
    return [];
  }
}

async function restoreBackup(backupFileName) {
  try {
    const backupPath = path.join(BACKUP_DIR, backupFileName);
    if (!fs.existsSync(backupPath)) {
      console.error('❌ 备份文件不存在:', backupFileName);
      return false;
    }

    const cmd = `mysql -h${DB_CONFIG.host} -P${DB_CONFIG.port} -u${DB_CONFIG.user} -p${DB_CONFIG.password} ${DB_CONFIG.database} < "${backupPath}"`;
    await execAsync(cmd);
    console.log('✅ 数据库恢复成功!');
    return true;
  } catch (error) {
    console.error('❌ 恢复数据库失败:', error.message);
    return false;
  }
}

function getBackupStats() {
  const backups = listBackups();
  const totalSize = backups.reduce((sum, b) => sum + (parseFloat(b.size) || 0), 0);
  return {
    totalBackups: backups.length,
    totalSize: totalSize.toFixed(2) + ' MB',
    latestBackup: backups[0] || null
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  switch (command) {
    case 'list':
      console.log('\n📋 备份列表:\n');
      listBackups().forEach((b, i) => console.log(`${i + 1}. ${b.name} (${b.size})`));
      break;
    case 'restore':
      if (!args[1]) { console.error('❌ 请指定备份文件名'); process.exit(1); }
      restoreBackup(args[1]);
      break;
    case 'stats':
      const s = getBackupStats();
      console.log(`总备份数: ${s.totalBackups}, 总大小: ${s.totalSize}`);
      break;
    default:
      performBackup();
  }
}

module.exports = { performBackup, listBackups, restoreBackup, getBackupStats, cleanOldBackups };
