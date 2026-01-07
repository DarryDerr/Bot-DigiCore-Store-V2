const sqlite = require("../../utils/sqliteDB");
const { embedMaker } = require("../../utils/embedMaker");

sqlite.createTable(`
  CREATE TABLE IF NOT EXISTS ai_mode (
    user_id TEXT PRIMARY KEY,
    mode TEXT
  );
`);

module.exports = {
  name: "aimode",
  description: "Ubah gaya bicara AI (per-user)",
  options: [
    {
      type: "string",
      name: "gaya",
      description: "Pilih gaya bicara AI",
      required: true,
      choices: [
        { name: "Default (Normal)", value: "default" },
        { name: "Lucu", value: "lucu" },
        { name: "Formal", value: "formal" },
        { name: "Galak", value: "galak" },
        { name: "Bucin", value: "bucin" },
      ],
    },
  ],

  async execute(interaction) {
    const mode = interaction.options.getString("gaya");

    try {
      sqlite.run(
        `INSERT INTO ai_mode (user_id, mode)
         VALUES (?, ?)
         ON CONFLICT(user_id) DO UPDATE SET mode = excluded.mode`,
        [interaction.user.id, mode]
      );

      const embed = embedMaker({
        title: "Mode AI Diubah",
        description: `Mode bicara AI kamu sekarang: **${mode.toUpperCase()}**`,
        color: "#00FF62",
      });

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    } catch (err) {
      console.error("[aimode] Error:", err);
      await interaction.reply({ content: "Gagal mengubah mode.", ephemeral: true });
    }
  },
};