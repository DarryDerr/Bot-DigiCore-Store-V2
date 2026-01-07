const { EmbedBuilder } = require("discord.js");

/**
 * embedMaker({
 *   title: "Judul",
 *   description: "Deskripsi",
 *   color: "#ff0000",
 *   footer: { text: "Footer text", iconURL: "..." } || "Footer text",
 *   thumbnail: "https://...",
 *   image: "https://...",
 *   author: { name: "Author", iconURL: "..." } || "Author",
 *   timestamp: true, // boolean
 *   fields: [ { name: "Field", value: "Isi" } ]
 * })
 */
function embedMaker(options = {}) {
  const {
    title,
    description,
    color,
    footer,
    thumbnail,
    image,
    author,
    timestamp,
    fields,
  } = options;

  const embed = new EmbedBuilder();

  if (color) embed.setColor(color);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);

  if (footer) {
    if (typeof footer === "string") embed.setFooter({ text: footer });
    else embed.setFooter(footer);
  }

  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);

  if (author) {
    if (typeof author === "string") embed.setAuthor({ name: author });
    else embed.setAuthor(author);
  }

  if (fields && Array.isArray(fields)) embed.addFields(fields);
  if (timestamp) embed.setTimestamp();

  return embed;
}

module.exports = { embedMaker };