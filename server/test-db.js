const { getDb } = require('./db/database');
getDb().then(() => { console.log('DB OK'); process.exit(0); }).catch(e => { console.error('DB ERROR:', e.message); process.exit(1); });
