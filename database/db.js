// Pure JavaScript SQLite adapter using sql.js (WebAssembly)
// Compatible with Vercel Serverless Functions - zero native C++ binaries, zero glibc requirements.
const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

class Database {
    constructor(dbPath, callback) {
        this.dbPath = dbPath;
        this.ready = false;
        this.queue = [];
        this.sqlDb = null;

        initSqlJs().then((SQL) => {
            if (this.dbPath && fs.existsSync(this.dbPath)) {
                try {
                    const fileBuffer = fs.readFileSync(this.dbPath);
                    this.sqlDb = new SQL.Database(fileBuffer);
                } catch (e) {
                    this.sqlDb = new SQL.Database();
                }
            } else {
                this.sqlDb = new SQL.Database();
            }

            this.ready = true;
            if (callback) callback(null);
            this._flush();
        }).catch((err) => {
            console.error("SQL.js initialization error:", err);
            if (callback) callback(err);
        });
    }

    _persist() {
        if (!this.dbPath || !this.sqlDb) return;
        try {
            const dir = path.dirname(this.dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const data = this.sqlDb.export();
            fs.writeFileSync(this.dbPath, Buffer.from(data));
        } catch (e) {
            // Silently continue if filesystem is read-only
        }
    }

    _flush() {
        while (this.queue.length > 0) {
            const op = this.queue.shift();
            op();
        }
    }

    _enqueue(op) {
        if (!this.ready) {
            this.queue.push(op);
        } else {
            op();
        }
    }

    run(sql, params, callback) {
        if (typeof params === "function") {
            callback = params;
            params = [];
        }
        params = params || [];

        this._enqueue(() => {
            try {
                this.sqlDb.run(sql, params);

                let lastID = 0;
                let changes = 0;
                try {
                    const idRes = this.sqlDb.exec("SELECT last_insert_rowid() AS id");
                    if (idRes.length && idRes[0].values.length) {
                        lastID = idRes[0].values[0][0];
                    }
                    const chgRes = this.sqlDb.exec("SELECT changes() AS changes");
                    if (chgRes.length && chgRes[0].values.length) {
                        changes = chgRes[0].values[0][0];
                    }
                } catch (e) {}

                this._persist();

                if (callback) {
                    callback.call({ lastID, changes }, null);
                }
            } catch (err) {
                if (callback) {
                    callback.call({ lastID: 0, changes: 0 }, err);
                } else {
                    console.error("Database run error:", err.message);
                }
            }
        });

        return this;
    }

    get(sql, params, callback) {
        if (typeof params === "function") {
            callback = params;
            params = [];
        }
        params = params || [];

        this._enqueue(() => {
            try {
                const stmt = this.sqlDb.prepare(sql);
                if (params && params.length) {
                    stmt.bind(params);
                }
                let row = undefined;
                if (stmt.step()) {
                    row = stmt.getAsObject();
                }
                stmt.free();

                if (callback) {
                    callback(null, row);
                }
            } catch (err) {
                if (callback) {
                    callback(err);
                }
            }
        });

        return this;
    }

    all(sql, params, callback) {
        if (typeof params === "function") {
            callback = params;
            params = [];
        }
        params = params || [];

        this._enqueue(() => {
            try {
                const stmt = this.sqlDb.prepare(sql);
                if (params && params.length) {
                    stmt.bind(params);
                }
                const rows = [];
                while (stmt.step()) {
                    rows.push(stmt.getAsObject());
                }
                stmt.free();

                if (callback) {
                    callback(null, rows);
                }
            } catch (err) {
                if (callback) {
                    callback(err);
                }
            }
        });

        return this;
    }
}

const sqliteAdapter = {
    Database: Database,
    verbose: function () {
        return sqliteAdapter;
    }
};

module.exports = sqliteAdapter;
