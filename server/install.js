/**
 * CRM 系统依赖安装脚本
 * 使用 mysql2（纯 JS），无需编译原生模块
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔧 安装 CRM 系统依赖...\n');

try {
  // 安装依赖
  console.log('📦 安装 npm 依赖...');
  execSync('npm install', { stdio: 'inherit', cwd: __dirname });

  // 验证 mysql2
  console.log('\n🧪 验证安装...');
  execSync('node -e "const mysql = require(\'mysql2/promise\'); console.log(\'✅ mysql2 验证成功\');"', {
    stdio: 'inherit',
    cwd: __dirname
  });

  console.log('\n🎉 安装完成！');
  console.log('   启动开发服务器: npm run dev');
  console.log('   启动生产服务器: npm start');

} catch (error) {
  console.error('\n❌ 安装失败:', error.message);
  process.exit(1);
}
