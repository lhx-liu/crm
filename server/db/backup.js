const fs = require('fs');
const path = require('path');

// 配置
const BACKUP_DIR = path.join(__dirname, 'backups');
const DB_PATH = path.join(__dirname, 'crm.db');
const MAX_BACKUPS = 30; // 保留最近30天的备份

/**
 * 确保备份目录存在
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log('✅ 创建备份目录:', BACKUP_DIR);
  }
}

/**
 * 生成备份文件名
 * 格式: crm_backup_YYYY-MM-DD_HH-mm-ss.db
 */
function generateBackupFileName() {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\..+/, '');
  return `crm_backup_${timestamp}.db`;
}

/**
 * 执行数据库备份
 */
function performBackup() {
  try {
    ensureBackupDir();

    // 检查数据库文件是否存在
    if (!fs.existsSync(DB_PATH)) {
      console.error('❌ 数据库文件不存在:', DB_PATH);
      return null;
    }

    // 生成备份文件名
    const backupFileName = generateBackupFileName();
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    // 复制数据库文件
    fs.copyFileSync(DB_PATH, backupPath);

    const stats = fs.statSync(backupPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('✅ 备份成功!');
    console.log(`   文件: ${backupFileName}`);
    console.log(`   大小: ${fileSizeInMB} MB`);
    console.log(`   路径: ${backupPath}`);

    // 清理旧备份
    cleanOldBackups();

    return backupPath;
  } catch (error) {
    console.error('❌ 备份失败:', error.message);
    return null;
  }
}

/**
 * 清理旧备份文件
 */
function cleanOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('crm_backup_') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // 按时间降序排列

    // 如果备份数量超过最大限制，删除旧的备份
    if (files.length > MAX_BACKUPS) {
      const filesToDelete = files.slice(MAX_BACKUPS);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️  删除旧备份: ${file.name}`);
      });
      console.log(`✅ 已清理 ${filesToDelete.length} 个旧备份`);
    }
  } catch (error) {
    console.error('❌ 清理旧备份失败:', error.message);
  }
}

/**
 * 列出所有备份
 */
function listBackups() {
  try {
    ensureBackupDir();

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('crm_backup_') && file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          created: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created);

    return files;
  } catch (error) {
    console.error('❌ 获取备份列表失败:', error.message);
    return [];
  }
}

/**
 * 恢复数据库
 * @param {string} backupFileName - 备份文件名
 */
function restoreBackup(backupFileName) {
  try {
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    if (!fs.existsSync(backupPath)) {
      console.error('❌ 备份文件不存在:', backupFileName);
      return false;
    }

    // 备份当前数据库（以防万一）
    if (fs.existsSync(DB_PATH)) {
      const currentBackup = DB_PATH + '.before_restore';
      fs.copyFileSync(DB_PATH, currentBackup);
      console.log('✅ 已备份当前数据库到:', currentBackup);
    }

    // 恢复数据库
    fs.copyFileSync(backupPath, DB_PATH);
    console.log('✅ 数据库恢复成功!');

    return true;
  } catch (error) {
    console.error('❌ 恢复数据库失败:', error.message);
    return false;
  }
}

/**
 * 获取备份统计信息
 */
function getBackupStats() {
  const backups = listBackups();
  const totalSize = backups.reduce((sum, backup) => {
    const sizeInMB = parseFloat(backup.size);
    return sum + (isNaN(sizeInMB) ? 0 : sizeInMB);
  }, 0);

  return {
    totalBackups: backups.length,
    totalSize: totalSize.toFixed(2) + ' MB',
    latestBackup: backups[0] || null
  };
}

// 如果直接运行此脚本，执行备份
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'list':
      console.log('\n📋 备份列表:\n');
      const backups = listBackups();
      if (backups.length === 0) {
        console.log('暂无备份');
      } else {
        backups.forEach((backup, index) => {
          console.log(`${index + 1}. ${backup.name}`);
          console.log(`   大小: ${backup.size}`);
          console.log(`   时间: ${backup.created.toLocaleString()}\n`);
        });
      }
      break;

    case 'restore':
      const backupFile = args[1];
      if (!backupFile) {
        console.error('❌ 请指定要恢复的备份文件名');
        console.log('用法: node backup.js restore <备份文件名>');
        process.exit(1);
      }
      restoreBackup(backupFile);
      break;

    case 'stats':
      console.log('\n📊 备份统计:\n');
      const stats = getBackupStats();
      console.log(`总备份数: ${stats.totalBackups}`);
      console.log(`总大小: ${stats.totalSize}`);
      if (stats.latestBackup) {
        console.log(`最新备份: ${stats.latestBackup.name}`);
        console.log(`备份时间: ${stats.latestBackup.created.toLocaleString()}`);
      }
      break;

    default:
      console.log('🔄 执行数据库备份...\n');
      performBackup();
  }
}

module.exports = {
  performBackup,
  listBackups,
  restoreBackup,
  getBackupStats,
  cleanOldBackups
};
