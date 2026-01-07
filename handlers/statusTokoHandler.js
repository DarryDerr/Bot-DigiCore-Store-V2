const cron = require("node-cron");
const moment = require("moment-timezone");
const { sendStatus } = require("../events/autoStatusToko");
const { log, error } = require("../utils/logger");
const { TIMEZONE, HARI_OPERASIONAL } = require("../config");

module.exports = (client) => {
  log("[AutoStatusToko] Menyiapkan jadwal otomatis per hari...");

  if (!Array.isArray(HARI_OPERASIONAL) || HARI_OPERASIONAL.length === 0) {
    return error("[AutoStatusToko] HARI_OPERASIONAL kosong atau tidak valid!");
  }

  const dayMap = {
    "Minggu": 0,
    "Senin": 1,
    "Selasa": 2,
    "Rabu": 3,
    "Kamis": 4,
    "Jumat": 5,
    "Sabtu": 6
  };

  HARI_OPERASIONAL.forEach(({ hari, buka, tutup }) => {
    const dayIndex = dayMap[hari];

    if (dayIndex === undefined) {
      return log(`[AutoStatusToko] Hari tidak valid: ${hari}`);
    }

    if (!buka || !tutup) {
      return log(`[AutoStatusToko] ${hari}: Libur (tidak dijadwalkan)`);
    }

    const [bukaJam, bukaMenit] = buka.split(":").map(Number);
    const [tutupJam, tutupMenit] = tutup.split(":").map(Number);

    const cronBuka = `${bukaMenit} ${bukaJam} * * ${dayIndex}`;
    cron.schedule(
      cronBuka,
      async () => {
        try {
          const now = moment().tz(TIMEZONE).format("HH:mm");
          log(`[AutoStatusToko] ${hari} ${now} WIB → Buka toko (AUTO)`);

          await sendStatus(client, true, { auto: true });
        } catch (err) {
          error("[AutoStatusToko] ERROR saat buka toko:", err);
        }
      },
      { timezone: TIMEZONE }
    );

    const cronTutup = `${tutupMenit} ${tutupJam} * * ${dayIndex}`;
    cron.schedule(
      cronTutup,
      async () => {
        try {
          const now = moment().tz(TIMEZONE).format("HH:mm");
          log(`[AutoStatusToko] ${hari} ${now} WIB → Tutup toko (AUTO)`);

          await sendStatus(client, false, { auto: true });
        } catch (err) {
          error("[AutoStatusToko] ERROR saat tutup toko:", err);
        }
      },
      { timezone: TIMEZONE }
    );

    log(`[AutoStatusToko] ${hari}: Buka ${buka} → Tutup ${tutup}`);
  });

  log("[AutoStatusToko] Jadwal otomatis aktif!");
}; 