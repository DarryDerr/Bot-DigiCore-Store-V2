const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder } = require("discord.js");
const { embedMaker } = require("../utils/embedMaker");
const { error, log } = require("../utils/logger");
const config = require("../config");
const db = require("../utils/sqliteDB");

db.createTable(`
  CREATE TABLE IF NOT EXISTS tickets (
    userId TEXT PRIMARY KEY,
    channelId TEXT,
    idTicket INTEGER,
    type TEXT,
    productName TEXT,
    price TEXT,
    createdAt INTEGER
  )
`);

function getAllTickets() {
  return db.all("SELECT * FROM tickets");
}

function getTicketByUser(userId) {
  return db.get("SELECT * FROM tickets WHERE userId = ?", [userId]);
}

function getTicketByChannel(channelId) {
  return db.get("SELECT * FROM tickets WHERE channelId = ?", [channelId]);
}

function saveTicketData(ticketObj) {
  db.run(
    `INSERT OR REPLACE INTO tickets
      (userId, channelId, idTicket, type, productName, price, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      ticketObj.userId,
      ticketObj.channelId,
      ticketObj.idTicket ?? ticketObj.ticketId ?? null,
      ticketObj.type ?? null,
      ticketObj.productName ?? null,
      ticketObj.price ?? null,
      ticketObj.createdAt ?? Date.now()
    ]
  );
}

function deleteTicketByUser(userId) {
  db.run("DELETE FROM tickets WHERE userId = ?", [userId]);
}

function deleteTicketByChannel(channelId) {
  db.run("DELETE FROM tickets WHERE channelId = ?", [channelId]);
}

function updateTicketFields(userId, fields = {}) {
  const allowed = ["productName", "price", "channelId"];
  const keys = Object.keys(fields).filter(k => allowed.includes(k));
  if (!keys.length) return;
  const sets = keys.map(k => `${k} = ?`).join(", ");
  const vals = keys.map(k => fields[k]);
  vals.push(userId);
  db.run(`UPDATE tickets SET ${sets} WHERE userId = ?`, vals);
}

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    const { customId, guild, user, channel } = interaction;
    const LOG_GIF = config.TICKET_ORDER_GIF;
    const logChannel = guild.channels.cache.get(config.TICKET_LOG_CHANNEL_ID);

    try {
      const all = getAllTickets();
      for (const t of all) {
        const chExists = guild.channels.cache.get(t.channelId);
        if (!chExists) {
          deleteTicketByUser(t.userId);
        }
      }
    } catch (e) {
      error("[Ticket] cleanup error:", e?.message ?? e);
    }

    if (customId === "panggil_seller") {
      return interaction.reply({
        content: `🔔 <@&${config.SELLER_ROLE_ID}> telah dipanggil oleh <@${user.id}>.`,
        ephemeral: false,
      });
    }

    if (customId === "create_ticket_order" || customId === "create_ticket_ask") {
      await interaction.deferReply({ ephemeral: true }).catch(() => null);

      const existing = getTicketByUser(user.id);
      if (existing) {
        const existingChannel = guild.channels.cache.get(existing.channelId);
        if (existingChannel) {
          return interaction.editReply({
            content: `❌ Kamu sudah memiliki tiket aktif di ${existingChannel}!`,
          });
        } else {
          deleteTicketByUser(user.id);
        }
      }

      const type = customId === "create_ticket_order" ? "order" : "ask";
      const category = channel?.parent;
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const usernameSafe = user.username.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const ticketName = `ticket-${type}-${usernameSafe}-${randomId}`;

      let ticketChannel;
      try {
        ticketChannel = await guild.channels.create({
          name: ticketName,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionsBitField.Flags.ViewChannel],
            },

            {
              id: user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.AttachFiles,
              ],
            },

            {
              id: config.SELLER_ROLE_ID,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.AttachFiles,
                PermissionsBitField.Flags.ManageMessages,
              ],
            },
          ],
        });

        if (category && category.type === ChannelType.GuildCategory) {
          await ticketChannel.setParent(category.id, {
            lockPermissions: false,
          });
        }

      } catch (err) {
        error("❌ Gagal membuat channel ticket:", err);
        return interaction.editReply({
          content: "❌ Terjadi kesalahan saat membuat ticket.",
        });
      }

      const title = type === "order" ? "🛒 Ticket Order" : "❓ Ticket Pertanyaan";
      const desc =
        type === "order"
          ? "Terima kasih telah melakukan order. Mohon tunggu respon dari seller."
          : "Terima kasih telah menghubungi kami. Tim kami akan segera menjawab pertanyaanmu.";

      const ticketEmbed = embedMaker({
        title: title,
        description: desc,
        color: type === "order" ? "#00FF62" : "#0062FF",
        fields: [
          { name: "ID Ticket", value: `${randomId}`, inline: true },
          { name: "Dibuat Oleh", value: `<@${user.id}>`, inline: true },
        ],
      });

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("send_struk")
          .setLabel("🧾 Bukti Pembayaran")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("panggil_seller")
          .setLabel("🔔 Panggil Seller")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("❌ Close Ticket")
          .setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({
        content: `<@${user.id}>`,
        embeds: [ticketEmbed],
        components: [actionRow],
      });

      await interaction.editReply({
        content: `✅ Ticket berhasil dibuat: ${ticketChannel}`,
      });

      saveTicketData({
        userId: user.id,
        channelId: ticketChannel.id,
        idTicket: randomId,
        type,
        createdAt: Date.now()
      });

      if (logChannel) {
        const openEmbed = embedMaker({
          title: "📥 Ticket Dibuka",
          fields: [
            { name: "Nama Ticket", value: ticketChannel.name },
            { name: "User", value: `<@${user.id}>` },
            { name: "ID Ticket", value: `${randomId}` },
            { name: "Tipe", value: type.toUpperCase() },
          ],
          color: "#0062FF",
          image: LOG_GIF,
          footer: "DigiCore Store • Ticket System",
          timestamp: true,
        });
        logChannel.send({ embeds: [openEmbed] }).catch(() => null);
      }
      return;
    }

    if (interaction.isButton() && customId === "send_struk") {
      const ticket = getTicketByChannel(interaction.channel.id);
      if (!ticket) {
        return interaction.reply({ content: "❌ Ticket tidak ditemukan.", ephemeral: true });
      }

      const ownerId = ticket.userId;
      if (ownerId !== interaction.user.id) {
        return interaction.reply({
          content: "❌ Hanya pembuat ticket yang bisa mengirim bukti pembayaran.",
          ephemeral: true,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId("upload_struk")
        .setTitle("🧾 Upload Struk Pembayaran")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("product_name")
              .setLabel("Nama Produk")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("Contoh: gamemode")
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("product_price")
              .setLabel("Harga Produk (Rp)")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("Contoh: 50000")
              .setRequired(true)
          )
        );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && customId === "upload_struk") {
      const productName = interaction.fields.getTextInputValue("product_name");
      const productPrice = interaction.fields.getTextInputValue("product_price");

      await interaction.reply({
        content: "✅ Silakan upload **gambar struk** di ticket ini (60 detik).",
        ephemeral: true,
      });

      const collector = interaction.channel.createMessageCollector({
        filter: (m) => m.author.id === interaction.user.id && m.attachments.size > 0,
        max: 1,
        time: 60_000,
      });

      collector.on("collect", async (m) => {
        const struk = m.attachments.first();

        const embed = embedMaker({
          title: "🧾 Struk Pembayaran",
          description:
            `› **Produk:** ${productName}\n` +
            `› **Harga:** Rp ${Number(productPrice).toLocaleString("id-ID")}\n` +
            `› **Pembeli:** <@${interaction.user.id}>`,
          color: "#00FF62",
          image: struk.url,
          timestamp: true,
        });

        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`confirm_payment_${interaction.user.id}`)
            .setLabel("✅ Konfirmasi Pembayaran")
            .setStyle(ButtonStyle.Success)
        );

        await interaction.channel.send({
          embeds: [embed],
          components: [confirmRow],
        }).catch(() => null);

        const ticketRecord = getTicketByChannel(interaction.channel.id);
        if (ticketRecord) {
          updateTicketFields(ticketRecord.userId, {
            productName: productName,
            price: `Rp ${Number(productPrice).toLocaleString("id-ID")}`
          });
        }

        const strukChannel = m.guild.channels.cache.get(config.STRUK_CHANNEL_ID);
        if (strukChannel) {
          await strukChannel.send({
            content: `📩 Ticket \`${interaction.channel.name}\` mengirim struk! Mohon dicek oleh <@&${config.SELLER_ROLE_ID}>.`,
            embeds: [embed],
          }).catch(() => null);
        }
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          interaction.followUp({
            content:
              "❌ Waktu upload struk habis. Klik tombol **Send Struk** lagi untuk mencoba ulang.",
            ephemeral: true,
          }).catch(() => null);
        }
      });

      return;
    }

    if (interaction.isButton() && customId.startsWith("confirm_payment_")) {
      if (!interaction.member.roles.cache.has(config.SELLER_ROLE_ID)) {
        return interaction.reply({
          content: "❌ Hanya seller yang dapat mengkonfirmasi pembayaran.",
          ephemeral: true,
        });
      }

      const buyerId = customId.split("_")[2];

      await interaction.message.edit({ components: [] }).catch(() => null);

      await interaction.channel.send({
        content: `<@${buyerId}>`,
        embeds: [
          embedMaker({
            title: "✅ Pembayaran Dikonfirmasi!",
            description:
              `**Pembayaran kamu sudah dikonfirmasi!**\n` +
              `Seller akan segera memproses ordermu.\n\n` +
              `Terima kasih telah berbelanja di DigiCore Store!`,
            color: "#00FF62",
            timestamp: true,
          })
        ],
      }).catch(() => null);

      await interaction.reply({ content: "✅ Pembayaran berhasil dikonfirmasi.", ephemeral: true }).catch(() => null);
      return;
    }

    if (interaction.isButton() && customId === "close_ticket") {
      await interaction.reply({ content: "📪 Menutup ticket dalam 5 detik...", ephemeral: true });

      const ticketRec = getTicketByChannel(channel.id);
      const ticketOwner = ticketRec?.userId;

      setTimeout(async () => {
        const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
        const transcriptTxt = (messages?.reverse().map((m) => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}`) || []).join("\n");

        const transcriptFile = new AttachmentBuilder(Buffer.from(transcriptTxt), {
          name: `${channel.name}-transcript.txt`,
        });

        const orderMsg = messages?.find((m) => m.embeds[0]?.title?.startsWith("🛒"));
        const orderEmbed = orderMsg?.embeds[0];

        const produk = ticketRec?.productName ||
          orderEmbed?.description?.match(/› \*\*Produk:\*\* (.+)/)?.[1] ||
          "Tidak diketahui";

        const harga = ticketRec?.price ||
          orderEmbed?.description?.match(/› \*\*Harga:\*\* (.+)/)?.[1] ||
          "Tidak diketahui";

        const buyerId = orderEmbed?.description?.match(/› \*\*Pembeli:\*\* <@(\d+)>/)?.[1] || ticketOwner;

        const adaStruk = !!messages?.some((m) => m.embeds[0]?.title === "🧾 Struk Pembayaran");

        const rekapChannel = guild.channels.cache.get(config.REKAP_ORDER_CHANNEL_ID);

        if (rekapChannel && ticketRec?.type === "order") {
          const rekapEmbed = embedMaker({
            title: "Rekap Order DigiCore Store",
            color: "#0062FF",
            fields: [
              { name: "› Pembeli", value: `<@${buyerId}>`, inline: true },
              { name: "› Ticket", value: channel.name, inline: true },
              { name: "› Produk", value: produk, inline: false },
              { name: "› Harga", value: harga, inline: true },
              { name: "› Struk", value: adaStruk ? "Ada" : "Tidak ada", inline: true },
              {
                name: "› Tanggal",
                value: `Dibuat: <t:${Math.floor((orderMsg?.createdTimestamp ?? Date.now()) / 1000)}:f>\nDitutup: <t:${Math.floor(Date.now() / 1000)}:f>`,
              },
              { name: "› Tipe Ticket", value: ticketRec?.type?.toUpperCase() || "UNKNOWN", inline: true }
            ],
            image: config.REKAP_ORDER_GIF,
            timestamp: true,
          });

          await rekapChannel.send({ embeds: [rekapEmbed] }).catch(() => null);
        }

        const ownerUser = await interaction.client.users.fetch(ticketOwner).catch(() => null);
        if (ownerUser && transcriptTxt.length > 0) {
          await ownerUser.send({
            content: `📄 Berikut transcript ticket kamu (${channel.name}):`,
            files: [transcriptFile],
          }).catch(() => null);
        }

        if (logChannel) {
          const closeEmbed = embedMaker({
            title: "📪 Ticket Ditutup",
            fields: [
              { name: "Nama Ticket", value: channel.name },
              { name: "User", value: `<@${ticketOwner}>` },
              { name: "Ditutup Oleh", value: `<@${user.id}>` },
              { name: "Tipe", value: ticketRec?.type?.toUpperCase() || "UNKNOWN", inline: true }
            ],
            color: "#FF4C4C",
            image: LOG_GIF,
            footer: "DigiCore Store • Ticket System",
            timestamp: true,
          });

          await logChannel.send({ embeds: [closeEmbed] }).catch(() => null);
        }

        if (ticketOwner) deleteTicketByUser(ticketOwner);
        else deleteTicketByChannel(channel.id);

        await channel.delete().catch(() => null);
      }, 5000);

      return;
    }
  }
};

module.exports.restoreTickets = async (client) => {
  try {
    const all = getAllTickets();
    for (const t of all) {
      const ch = await client.channels.fetch(t.channelId).catch(() => null);
      if (!ch) deleteTicketByUser(t.userId);
    }
    log("[Ticket] restoreTickets: cleanup selesai");
  } catch (e) {
    error("[Ticket] restoreTickets error:", e?.message ?? e);
  }
};