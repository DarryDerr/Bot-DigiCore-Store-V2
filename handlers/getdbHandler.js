const { MessageFlags } = require("discord.js");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const { error } = require("../utils/logger");

function escapeValue(value) {
    if (value === null) return "NULL";
    if (typeof value === "number") return value;
    if (typeof value === "boolean") return value ? 1 : 0;

    return `'${String(value)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t")}'`;
}

async function exportDatabase({ host, port, user, pass, db, filePath }) {
    const conn = await mysql.createConnection({
        host,
        port,
        user,
        password: pass,
        database: db
    });

    let sql = "";

    sql += `-- ---------------------------------\n`;
    sql += `-- mysqldump-like backup\n`;
    sql += `-- Database: ${db}\n`;
    sql += `-- ---------------------------------\n\n`;

    sql += `SET NAMES utf8mb4;\n`;
    sql += `SET FOREIGN_KEY_CHECKS=0;\n\n`;

    sql += `CREATE DATABASE IF NOT EXISTS \`${db}\`\n`;
    sql += `  DEFAULT CHARACTER SET utf8mb4\n`;
    sql += `  DEFAULT COLLATE utf8mb4_unicode_ci;\n\n`;
    sql += `USE \`${db}\`;\n\n`;

    const [tables] = await conn.query("SHOW TABLES");
    if (tables.length === 0) {
        sql += "-- Database kosong\n";
    } else {
        const tableKey = Object.keys(tables[0])[0];

        for (const t of tables) {
            const table = t[tableKey];

            const [[createResult]] = await conn.query(
                `SHOW CREATE TABLE \`${table}\``
            );

            sql += `-- ----------------------------\n`;
            sql += `-- Table structure for ${table}\n`;
            sql += `-- ----------------------------\n`;
            sql += `DROP TABLE IF EXISTS \`${table}\`;\n`;
            sql += `${createResult["Create Table"]};\n\n`;

            const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
            if (rows.length === 0) continue;

            const columns = Object.keys(rows[0])
                .map(col => `\`${col}\``)
                .join(", ");

            sql += `LOCK TABLES \`${table}\` WRITE;\n`;
            sql += `ALTER TABLE \`${table}\` DISABLE KEYS;\n`;
            sql += `INSERT INTO \`${table}\` (${columns}) VALUES\n`;

            const values = rows.map(row => {
                const vals = Object.values(row)
                    .map(v => escapeValue(v))
                    .join(", ");
                return `(${vals})`;
            });

            sql += values.join(",\n");
            sql += `;\n`;
            sql += `ALTER TABLE \`${table}\` ENABLE KEYS;\n`;
            sql += `UNLOCK TABLES;\n\n`;
        }
    }

    sql += `SET FOREIGN_KEY_CHECKS=1;\n`;

    fs.writeFileSync(filePath, sql);
    await conn.end();
}

module.exports = async (client) => {
    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isModalSubmit()) return;
        if (interaction.customId !== "getdb-modal") return;

        const endpoint = interaction.fields.getTextInputValue("db-endpoint");
        const user = interaction.fields.getTextInputValue("db-user");
        const pass = interaction.fields.getTextInputValue("db-pass");
        const db = interaction.fields.getTextInputValue("db-name");

        const [host, port] = endpoint.split(":");

        const tempDir = path.join(process.cwd(), ".db_temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const filePath = path.join(tempDir, `${db}.sql`);

        await interaction.reply({
            content: "⏳ **Sedang mengekspor database...**",
            flags: MessageFlags.Ephemeral
        });

        try {
            await exportDatabase({
                host,
                port: Number(port),
                user,
                pass,
                db,
                filePath
            });

            await interaction.editReply({
                content: `✅ Backup database **${db}** berhasil dibuat!`,
                files: [filePath],
                flags: MessageFlags.Ephemeral
            });

            setTimeout(() => {
                try { fs.unlinkSync(filePath); } catch {}
            }, 10000);

        } catch (err) {
            error(err);
            await interaction.editReply({
                content: "❌ Gagal mengekspor database. Periksa endpoint / login DB.",
                flags: MessageFlags.Ephemeral
            });
        }
    });
};