const fs = require("fs");
const path = require("path");
const { log } = require("../utils/logger");

module.exports = (client) => {
  const eventsPath = path.join(__dirname, "..", "events");
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));

  for (const file of eventFiles) {
    const event = require(`../events/${file}`);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }

  log(`[EventHandler] Events loaded: ${eventFiles.length}`);
};