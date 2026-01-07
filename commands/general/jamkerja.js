const { embedMaker } = require("../../utils/embedMaker");
const { TIMEZONE, HARI_OPERASIONAL } = require('../../config');
const moment = require('moment-timezone');

module.exports = {
    name: 'jamkerja',
    description: 'Menampilkan Jam Operasional DigiCore Store',

    async execute(interaction) {
        const today = moment().tz(TIMEZONE).format('dddd');
        const now = moment().tz(TIMEZONE).format('HH:mm');

        const hariIni = HARI_OPERASIONAL.find(h => h.hari.toLowerCase() === today.toLowerCase());

        const isBuka = hariIni?.buka && hariIni?.tutup && now >= hariIni.buka && now <= hariIni.tutup;

        const embed = embedMaker({
            title: 'JAM OPERASIONAL DigiCore Store',
            description: 'Berikut jadwal Buka & Tutup layanan di DigiCore Store.\nMohon untuk melakukan pemesanan pada Jam Kerja.\nPemesanan diluar Jam Kerja akan dilayani di Jam Kerja berikutnya.',
            color: isBuka ? '#00FF62' : '#FF4C4C',
            fields:
                HARI_OPERASIONAL.map(({ hari, buka, tutup }) => ({
                    name: `📅 ${hari}`,
                    value: buka && tutup ? `\`${buka} - ${tutup} WIB\`` : `\`Toko Tutup / Libur\``,
                    inline: true
                })
            )
        });

        await interaction.reply({ embeds: [embed] });
    }
};