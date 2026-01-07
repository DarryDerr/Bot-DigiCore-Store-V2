const db = require('../../utils/sqliteDB');
const config = require('../../config');

module.exports = {
  name: 'editpayment',
  description: 'Mengedit metode pembayaran',

  options: [
    {
      name: 'type',
      description: 'Type pembayaran yang mau diedit',
      type: 'string',
      required: true
    },
    {
      name: 'newtype',
      description: 'Type pembayaran baru',
      type: 'string'
    },
    {
      name: 'icon',
      description: 'Icon / emoji payment baru',
      type: 'string'
    },
    {
      name: 'message',
      description: 'Keterangan / nomor baru',
      type: 'string'
    },
    {
      name: 'image',
      description: 'Link gambar / QR baru',
      type: 'string'
    }
  ],

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(config.ADMIN_ROLE_ID)) {
      return interaction.reply({
        content: '🚫 Kamu tidak memiliki izin',
        ephemeral: true
      });
    }

    const type = interaction.options.getString('type');
    const newType = interaction.options.getString('newtype');
    const icon = interaction.options.getString('icon');
    const message = interaction.options.getString('message');
    const image = interaction.options.getString('image');

    const payment = db.get(
      `SELECT * FROM payments WHERE LOWER(type) = LOWER(?)`,
      [type]
    );

    if (!payment) {
      return interaction.reply({
        content: `❌ Payment **${type}** tidak ditemukan`,
        ephemeral: true
      });
    }

    db.run(
      `UPDATE payments
       SET type = ?, icon = ?, message = ?, image = ?
       WHERE id = ?`,
      [
        newType ?? payment.type,
        icon ?? payment.icon,
        message ?? payment.message,
        image ?? payment.image,
        payment.id
      ]
    );

    await interaction.reply({
      content: `✏️ Payment **${newType ?? payment.type}** berhasil diperbarui`,
      ephemeral: true
    });
  }
};