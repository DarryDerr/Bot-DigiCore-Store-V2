const { Events } = require("discord.js");
const fetch = globalThis.fetch || require("node-fetch");
const config = require("../config");
const sqlite = require("../utils/sqliteDB");
const { error, warn } = require('../utils/logger');

const AI_CHANNEL_ID = config.AI_CHANNEL_ID;
const OWNER_ID = config.ownerId;

sqlite.createTable(`
  CREATE TABLE IF NOT EXISTS ai_memory (
    rowid INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    role TEXT,
    content TEXT,
    timestamp INTEGER
  );
`);

sqlite.createTable(`
  CREATE TABLE IF NOT EXISTS ai_mode (
    user_id TEXT PRIMARY KEY,
    mode TEXT
  );
`);

sqlite.createTable(`
  CREATE TABLE IF NOT EXISTS ai_channel_mode (
    channel_id TEXT PRIMARY KEY,
    mode TEXT
  );
`);

function saveMessage(userId, role, content) {
  try {
    sqlite.run(
      `INSERT INTO ai_memory (user_id, role, content, timestamp) VALUES (?, ?, ?, ?)`,
      [userId, role, content, Date.now()]
    );
  } catch (e) { error("[AI saveMessage]", e); }
}

function getMemoryRows(userId) {
  try {
    return sqlite.all(
      `SELECT role, content, timestamp FROM ai_memory WHERE user_id = ? ORDER BY timestamp ASC`,
      [userId]
    );
  } catch (e) { error("[AI getMemoryRows]", e); return []; }
}

function trimMemoryByLimit(userId, maxEntries) {
  try {
    const rows = sqlite.all(`SELECT rowid FROM ai_memory WHERE user_id = ? ORDER BY timestamp ASC`, [userId]);
    if (rows.length > maxEntries) {
      const remove = rows.slice(0, rows.length - maxEntries);
      remove.forEach(r => sqlite.run(`DELETE FROM ai_memory WHERE rowid = ?`, [r.rowid]));
    }
  } catch (e) { error("[AI trimMemory]", e); }
}

function getUserMode(userId) {
  try {
    const row = sqlite.get(`SELECT mode FROM ai_mode WHERE user_id = ?`, [userId]);
    return row?.mode || "default";
  } catch (e) { error("[AI getUserMode]", e); return "default"; }
}

function getChannelMode(channelId) {
  try {
    const row = sqlite.get(`SELECT mode FROM ai_channel_mode WHERE channel_id = ?`, [channelId]);
    return row?.mode || null;
  } catch (e) { error("[AI getChannelMode]", e); return null; }
}

const cooldown = new Map();
const BASE_COOLDOWN_MS = 3000;

function canProceed(userId) {
  const now = Date.now();
  if (!cooldown.has(userId)) {
    cooldown.set(userId, { count: 0, last: 0, resetTimer: null });
  }

  const info = cooldown.get(userId);
  const dynamicWait = BASE_COOLDOWN_MS + (info.count * 1000);

  if (now - info.last < dynamicWait) {
    const remaining = Math.ceil((dynamicWait - (now - info.last)) / 1000);
    return { ok: false, waitSeconds: remaining };
  }

  info.count = Math.min(info.count + 1, 20);
  info.last = now;

  if (info.resetTimer) clearTimeout(info.resetTimer);
  info.resetTimer = setTimeout(() => {
    const data = cooldown.get(userId);
    if (data) { data.count = 0; data.resetTimer = null; }
  }, 60000);

  return { ok: true };
}

const BANNED_TOKENS = ["token", "api_key", "apikey", "password", "pass", "ssn", "creditcard", "secret"];

function containsBanned(content) {
  const low = content.toLowerCase();
  return BANNED_TOKENS.some(w => low.includes(w));
}

const personalities = {
  default: "Kamu adalah Darry AI — asisten Discord ramah, santai dan informatif.",
  lucu: "Kamu adalah Darry AI versi lucu, banyak bercanda dan pakai emoji.",
  formal: "Kamu adalah Darry AI versi formal, sopan dan rapi.",
  galak: "Kamu adalah Darry AI versi galak, tegas dan sedikit sarkas.",
  bucin: "Kamu adalah Darry AI versi bucin, romantis dan menggombal.",
};

const RULES_PROMPT =
  "Peraturan: Jangan pernah meminta, menyimpan, atau membagikan token, password, atau data sensitif.";

const DEV_PROMPT =
  "Jika user bertanya hal teknis tentang bot/store, jawab dengan instruksi langkah demi langkah.";

async function callOpenAIChat(messages, model = "gpt-4o-mini", max_tokens = 800, temperature = 0.6) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.OpenAIToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model, messages, max_tokens, temperature, n: 1
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "AI tidak merespon.";
}

async function callOpenAIImage(prompt, size = "1024x1024") {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.OpenAIToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, size, n: 1 })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI image error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  return data.data?.[0]?.url || null;
}

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    try {
      if (message.author.bot) return;

      const isDM = message.channel.type === 1;
      const isAIChannel = message.channel.id === AI_CHANNEL_ID;
      if (!isDM && !isAIChannel) return;

      if (containsBanned(message.content)) {
        return message.reply("❌ Pesanmu mengandung kata yang dilarang.");
      }

      const cd = canProceed(message.author.id);
      if (!cd.ok) {
        return message.reply(`Tunggu **${cd.waitSeconds} detik** sebelum bertanya lagi.`);
      }

      const finalMode =
        getChannelMode(message.channel.id) ||
        getUserMode(message.author.id) ||
        "default";

      let maxMemory = 30;
      if (finalMode === "formal") maxMemory = 40;
      if (finalMode === "lucu" || finalMode === "bucin") maxMemory = 18;
      if (finalMode === "galak") maxMemory = 25;

      saveMessage(message.author.id, "user", message.content);
      trimMemoryByLimit(message.author.id, maxMemory);

      const memoryRows = getMemoryRows(message.author.id) || [];
      const memoryMessages = memoryRows.map(r => ({ role: r.role, content: r.content }));

      const layeredPrompt = [
        { role: "system", content: personalities[finalMode] },
        { role: "system", content: RULES_PROMPT },
        { role: "system", content: DEV_PROMPT },
      ];

      if (message.content.includes("```")) {
        layeredPrompt.push({
          role: "system",
          content: "User mengirim kode. Tolong debug dan berikan solusi terbaik."
        });
      }

      const low = message.content.toLowerCase();
      const triggerImage = ["banner", "logo", "thumbnail", "header toko"].some(w => low.includes(w));

      await message.channel.sendTyping();

      if (triggerImage) {
        try {
          const url = await callOpenAIImage(`Desain ${message.content}, gaya modern & clean.`);
          if (url) {
            await message.reply({ content: "Berikut hasil desain:", files: [url] });

            saveMessage(message.author.id, "assistant", `Generated image: ${url}`);
            trimMemoryByLimit(message.author.id, maxMemory);
            return;
          }
        } catch (err) {
          warn("[IMG GEN ERROR] " + err.message);
        }
      }

      const trimmedMem = memoryMessages.slice(-20);
      const messagesPayload = [
        ...layeredPrompt,
        ...trimmedMem,
        { role: "user", content: message.content }
      ];

      const aiReply = await callOpenAIChat(messagesPayload, "gpt-4o-mini", 700, 0.7);

      saveMessage(message.author.id, "assistant", aiReply);
      trimMemoryByLimit(message.author.id, maxMemory);

      if (aiReply.length > 1800) {
        return message.reply({
          content: "Jawaban terlalu panjang, aku kirim sebagai file:",
          files: [{ attachment: Buffer.from(aiReply, "utf8"), name: "darry_ai.txt" }]
        });
      }

      await message.reply(aiReply);

    } catch (err) {
      error("[AI ERROR]", err);
      try { await message.reply("Terjadi error saat memproses pesan."); } catch { }
    }
  },
};