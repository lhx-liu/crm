# 数据库备份系统

## 📌 功能特性

- ✅ **定时自动备份** - 每天凌晨2点自动备份数据库
- ✅ **手动备份** - 支持通过API或命令行手动触发备份
- ✅ **自动清理** - 自动删除超过30天的旧备份
- ✅ **备份恢复** - 支持从备份文件恢复数据库
- ✅ **备份管理** - 查看备份列表和统计信息

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 启动服务器

```bash
npm start
```

启动后会自动启用定时备份功能（每天凌晨2点执行）

---

## 📖 使用方法

### 方法一：API 接口

#### 1. 创建备份
```bash
POST http://localhost:3001/api/backups/create
```

#### 2. 查看所有备份
```bash
GET http://localhost:3001/api/backups
```

#### 3. 查看备份统计
```bash
GET http://localhost:3001/api/backups/stats
```

### 方法二：命令行

#### 1. 执行备份
```bash
cd server/db
node backup.js
```

#### 2. 查看备份列表
```bash
node backup.js list
```

#### 3. 查看备份统计
```bash
node backup.js stats
```

#### 4. 恢复数据库
```bash
node backup.js restore crm_backup_2024-01-15_14-30-00.db
```

---

## 📁 备份文件位置

```
server/db/
├── crm.db              # 当前数据库
└── backups/            # 备份目录
    ├── crm_backup_2024-01-15_02-00-00.db
    ├── crm_backup_2024-01-16_02-00-00.db
    └── ...
```

---

## ⚙️ 配置说明

### 修改定时备份时间

编辑 `server/index.js`：

```javascript
// 每天凌晨2点执行（当前设置）
cron.schedule('0 2 * * *', () => {
  performBackup();
});

// 每6小时执行一次
cron.schedule('0 */6 * * *', () => {
  performBackup();
});

// 每周一凌晨3点执行
cron.schedule('0 3 * * 1', () => {
  performBackup();
});
```

### 修改备份数量限制

编辑 `server/db/backup.js`：

```javascript
const MAX_BACKUPS = 30; // 保留最近30天的备份（可修改）
```

---

## 🔄 备份策略建议

### 生产环境推荐配置：

1. **定时备份频率**
   - 核心业务：每6小时一次
   - 一般业务：每天一次（默认）

2. **备份保留时间**
   - 高频备份：保留7天
   - 日常备份：保留30天（默认）

3. **异地备份**
   - 定期将备份文件下载到本地
   - 使用云存储同步备份文件

---

## 🛠️ 故障恢复

### 场景1：数据库损坏

```bash
# 1. 停止服务器
# 2. 查看备份列表
cd server/db
node backup.js list

# 3. 选择最新的备份恢复
node backup.js restore crm_backup_YYYY-MM-DD_HH-MM-SS.db

# 4. 重启服务器
```

### 场景2：误删数据

```bash
# 1. 停止服务器
# 2. 恢复到指定时间的备份
node backup.js restore crm_backup_YYYY-MM-DD_HH-MM-SS.db

# 3. 重启服务器
```

---

## 📊 监控建议

### 1. 定期检查备份

```bash
# 每周检查备份统计
curl http://localhost:3001/api/backups/stats
```

### 2. 日志监控

备份操作会输出到控制台日志，建议：
- 记录备份日志到文件
- 设置告警通知（备份失败时）

---

## ⚠️ 注意事项

1. **磁盘空间**：确保有足够的磁盘空间存储备份
2. **权限问题**：确保程序有读写 `backups/` 目录的权限
3. **生产环境**：建议额外使用云服务商的快照功能双重保险
4. **测试恢复**：定期测试备份恢复流程，确保备份可用

---

## 🔐 安全建议

1. **访问控制**：限制备份API的访问权限
2. **加密备份**：对敏感数据考虑加密备份文件
3. **异地存储**：定期将备份复制到其他服务器或云存储

---

## 📞 技术支持

如遇问题，请检查：
1. 服务器日志输出
2. `backups/` 目录权限
3. 磁盘空间是否充足
4. 数据库文件是否正常
