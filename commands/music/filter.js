const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const logger = require ('../../logger.js');

const fs = require('fs');

const { getQueue } = require('./play.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("filter")
        .setDescription("Manage Phrases or IDs to filter out when queueing albums")
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addSubcommand(subcommand =>
            subcommand.setName("add")
                .setDescription("Add a new filter")
                .addStringOption(option =>
                    option.setName("value")
                        .setDescription("String or id to filter")
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName("remove")
                .setDescription("Remove a filter")
                .addStringOption(option =>
                    option.setName("value")
                        .setDescription("Filter to remove")
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand.setName("list")
                .setDescription("List filters")),

    async execute(interaction, config) {
        if (interaction.options.getSubcommand() === 'add') {
            if (!config.music.filters) {
                config.music.filters = [];
            }

            config.music.filters.push(interaction.options.getString('value'));

            fs.writeFileSync(config.path, JSON.stringify(config, null, 4));

            await interaction.reply("Filter added");
        }
        else if (interaction.options.getSubcommand() === 'remove') {
            if (config.music.filters && config.music.filters.length >= 1) {
                let filterIndex = config.music.filters.indexOf(interaction.options.getString('value'));
                if (filterIndex >= 0) {
                    config.music.filters.splice(filterIndex, 1);

                    fs.writeFileSync(config.path, JSON.stringify(config, null, 4));

                    await interaction.reply("Filter removed");

                    // Log to console
                    logger.log('info', "[" + interaction.guild.name + "] " + interaction.user.username + " removed filter \"" + interaction.options.getString('value') + "\"");
                }
                else {
                    await interaction.reply({ content: "Failed to find specified filter", ephemeral: true });
                }
            }
            else {
                await interaction.reply("There are no filters currently");
            }
        }
        else if (interaction.options.getSubcommand() === 'list') {
            if (config.music.filters && config.music.filters.length >= 1) {
                // Reply to user
                await interaction.reply(config.music.filters.join('\n'));
            }
            else {
                await interaction.reply("There are no filters currently");
            }
        }
    },

    async autocomplete(interaction, config) {
        const focusedValue = interaction.options.getFocused();
        
        if (interaction.options.getSubcommand() === 'remove') {
            const choices = config.music.filters;
            const filtered = choices.filter(choice => choice.startsWith(focusedValue));
            try {
                await interaction.respond(
                filtered.map(choice => ({ name: choice, value: choice })))
            }
            catch (err) {
                logger.error(err);
            }
        }
    },
};