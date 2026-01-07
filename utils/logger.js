const chalk = require("chalk");
const { WebhookClient } = require("discord.js");
const { embedMaker } = require("./embedMaker");
const config = require("../config");

let errorHook = null;
if (process.env.WEBHOOK_ID && process.env.WEBHOOK_TOKEN) {
  errorHook = new WebhookClient({
    id: process.env.WEBHOOK_ID,
    token: process.env.WEBHOOK_TOKEN,
  });
} else {
  console.warn(chalk.yellow("[WARN] Webhook logger tidak aktif (WEBHOOK_ID / WEBHOOK_TOKEN kosong)"));
}

function sendToHook(type, message, color) {
  if (!errorHook) return;
  const cleanType = type.toUpperCase();
  const isError = cleanType.includes("ERROR");
  if (!isError) return;

  const raw =
    typeof message === "string"
      ? message
      : message?.stack || JSON.stringify(message, null, 2);
  const safeContent = raw.length > 1900 ? raw.slice(0, 1900) + "\n..." : raw;

  const embed = embedMaker({
    title: "🚨 **Error Terdeteksi!** 🚨",
    description: `\`\`\`js\n${safeContent}\n\`\`\``,
    color: color || 0xFF4C4C,
    timestamp: true,
  });

  errorHook.send({ embeds: [embed] }).catch(() => {});
}

function log(...args) {
  if (!config.DEBUGGING) return;
  console.log(chalk.blue("[DEBUG]"), ...args);
}

function success(...args) {
  if (!config.DEBUGGING) return;
  console.log(chalk.green("[SUCCESS]"), ...args);
}

function warn(...args) {
  console.warn(chalk.yellow("[WARN]"), ...args);
}

function error(...args) {
  console.error(chalk.red("[ERROR]"), ...args);
  const msg = args.map(a => (a?.stack ? a.stack : a)).join("\n");
  sendToHook("ERROR", msg, 0xFF4C4C);
}

function setupGlobalErrorHooks() {
  const hook = (type, err) => {
    const msg = err?.stack || err;
    console.error(chalk.bgRed.white(`\n⚠️ ${type} ⚠️`), "\n", msg);
    sendToHook(type, msg, 0xFF4C4C);
  };

  process.on("unhandledRejection", (e) => hook("Unhandled Rejection", e));
  process.on("uncaughtException", (e) => hook("Uncaught Exception", e));
  process.on("uncaughtExceptionMonitor", (e) => hook("Uncaught Exception Monitor", e));

  process.on("beforeExit", (code) => {
    if (code !== 0) console.error(chalk.bgRed.white(`[Process Before Exit] code: ${code}`));
    else console.log(chalk.green(`[INFO SUCCESS] Process exiting normally with code ${code}`));
  });

  process.on("exit", (code) => {
    if (code !== 0) console.error(chalk.bgRed.white(`[Process Exit] code: ${code}`));
    else console.log(chalk.green(`[INFO SUCCESS]`), `Process exited normally with code ${code}`);
  });
}

setupGlobalErrorHooks();

module.exports = { log, success, warn, error };