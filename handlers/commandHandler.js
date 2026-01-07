const fs = require("fs");
const path = require("path");
const { REST, Routes, SlashCommandBuilder, SlashCommandSubcommandBuilder, PermissionFlagsBits } = require("discord.js");
const { log, success, error, warn } = require("../utils/logger");
require("dotenv").config();

/**
 * Konversi data opsi dari bentuk object JSON ke builder method Discord.js
 */
function applyOptions(builder, options = [], filePath = "unknown") {
  for (const opt of options) {
    const type = opt.type?.toLowerCase();

    let optionBuilder;
    switch (type) {
      case "string":
        optionBuilder = builder.addStringOption(o => baseOption(o, opt));
        break;
      case "integer":
        optionBuilder = builder.addIntegerOption(o => baseOption(o, opt));
        break;
      case "number":
        optionBuilder = builder.addNumberOption(o => baseOption(o, opt));
        break;
      case "boolean":
        optionBuilder = builder.addBooleanOption(o => baseOption(o, opt));
        break;
      case "user":
        optionBuilder = builder.addUserOption(o => baseOption(o, opt));
        break;
      case "channel":
        optionBuilder = builder.addChannelOption(o => baseOption(o, opt));
        break;
      case "role":
        optionBuilder = builder.addRoleOption(o => baseOption(o, opt));
        break;
      case "mentionable":
        optionBuilder = builder.addMentionableOption(o => baseOption(o, opt));
        break;
      case "attachment":
        optionBuilder = builder.addAttachmentOption(o => baseOption(o, opt));
        break;
      default:
        warn(`[WARN] Unknown option type '${type}' at ${filePath}!`);
    }
  }
}

/**
 * Atur opsi dasar (name, description, required, choices, min/max value)
 */
function baseOption(o, opt) {
  o.setName(opt.name)
   .setDescription(opt.description || "Tanpa deskripsi");

  if (opt.required) o.setRequired(true);
  if (opt.choices && Array.isArray(opt.choices)) o.addChoices(...opt.choices);
  if (opt.minValue) o.setMinValue(opt.minValue);
  if (opt.maxValue) o.setMaxValue(opt.maxValue);
  if (opt.minLength) o.setMinLength(opt.minLength);
  if (opt.maxLength) o.setMaxLength(opt.maxLength);

  return o;
}

async function loadCommands(client) {
  const commands = [];
  const commandsPath = path.join(__dirname, "..", "commands");
  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith(".js"));

    for (const file of commandFiles) {
      const command = require(path.join(folderPath, file));
      if (!command.execute) continue;

      let builder;

      if (command.data) {
        builder = command.data;
      } else if (command.name && command.description) {
        builder = new SlashCommandBuilder()
          .setName(command.name)
          .setDescription(command.description);

        if (command.defaultMemberPermissions) {
          const perm = PermissionFlagsBits[command.defaultMemberPermissions] || command.defaultMemberPermissions;
          builder.setDefaultMemberPermissions(perm);
        }

        if (typeof command.dmPermission === "boolean") {
          builder.dm_permission = command.dmPermission;
        }

        if (Array.isArray(command.subcommands)) {
          for (const subcommand of command.subcommands) {
            const subcommandBuilder = new SlashCommandSubcommandBuilder()
              .setName(subcommand.name)
              .setDescription(subcommand.description);

            if (Array.isArray(subcommand.options)) {
              applyOptions(subcommandBuilder, subcommand.options, path.join(folder, file));
            }

            builder.addSubcommand(subcommandBuilder);
          }
        }

        if (Array.isArray(command.options)) {
          applyOptions(builder, command.options, path.join(folder, file));
        }
      } else continue;

      client.commands.set(builder.name, command);
      commands.push(builder.toJSON());
    }
  }

  success(`[CommandHandler] Commands loaded: ${client.commands.size}`);
  return commands;
}

async function deployCommands(commands) {
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  try {
    log("[CommandHandler] Refreshing application commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    success("[CommandHandler] Commands successfully reloaded!");
  } catch (err) {
    error("[CommandHandler] Failed to reload commands:", err);
  }
}

module.exports = async (client, options = { deploy: false }) => {
  const commands = await loadCommands(client);
  if (options.deploy) await deployCommands(commands);
};