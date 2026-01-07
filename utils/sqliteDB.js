const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { log } = require('./logger')

class SQLiteWrapper {
  constructor(dbName = "database.db") {
    this.setDB(dbName);
  }

  setDB(dbName) {
    const dbPath = path.join(__dirname, "../data", dbName);
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    this.db = new Database(dbPath);
    this.dbName = dbName;

    log(`[SQLite] Loaded database file: ${dbName}`);
  }

  createTable(sql) {
    return this.db.prepare(sql).run();
  }

  run(sql, params = []) {
    return this.db.prepare(sql).run(params);
  }

  get(sql, params = []) {
    return this.db.prepare(sql).get(params);
  }

  all(sql, params = []) {
    return this.db.prepare(sql).all(params);
  }
}

module.exports = new SQLiteWrapper("main.db");