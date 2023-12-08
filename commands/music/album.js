const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const logger = require ('../../logger.js');

const fs = require('fs');
const { playlist_info } = require('play-dl');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("album")
        .setDescription("Manage autofilled albums")
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addSubcommand(subcommand =>
            subcommand.setName("add")
                .setDescription("Save an album to autofill")
                .addStringOption(option =>
                    option.setName("url")
                        .setDescription("Album url")
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName("remove")
                .setDescription("Remove an album from autofill")
                .addStringOption(option =>
                    option.setName("url")
                        .setDescription("Album url")
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand.setName("list")
                .setDescription("List autofilled albums")),

    async execute(interaction, config) {
        if (interaction.options.getSubcommand() === 'add') {
            if (!config.music.savedAlbums) {
                config.music.savedAlbums = [];
            }

            let url = interaction.options.getString('url');
        
            playlist_info(url, { incomplete: true })
            .then(albumInfo => {
                let albumInfoFormatted = {
                    "name": albumInfo.title,
                    "value": albumInfo.url
                }

                config.music.savedAlbums.push(albumInfoFormatted);

                fs.writeFileSync(config.path, JSON.stringify(config, null, 4));

                interaction.reply("Saved album \"" + albumInfo.title + "\"");

                // Log to console
                logger.log('info', "[" + interaction.guild.name + "] " + interaction.user.username + " saved album \"" + albumInfo.title + "\"");
            })
            .catch(err => {
                let errorResponse;

                if (err == "Error: API-Error: The playlist does not exist.") {
                    errorResponse = "Couldn't access playlist, it's probably private";
                }
                else if (err == "Error: Unknown Playlist") {
                    errorResponse = "Couldn't find a playlist with that url";
                }
                else {
                    errorResponse = "Something went wrong, more info found in logs";
                    // Log full error due to it being unknown
                    logger.error(err);
                }

                // Inform user
                interaction.reply({ content: errorResponse, ephemeral: true });
            })
        }
        else if (interaction.options.getSubcommand() === 'remove') {
            if (config.music.savedAlbums && config.music.savedAlbums.length >= 1) {
                let albumUrl = interaction.options.getString('url');

                let albumIndex = config.music.savedAlbums.map(album => album.value).indexOf(albumUrl)

                console.log(albumUrl, '\n', albumIndex);

                if (albumIndex >= 0) {
                    config.music.savedAlbums.splice(albumIndex, 1);

                    fs.writeFileSync(config.path, JSON.stringify(config, null, 4));

                    await interaction.reply("Album removed");

                    // Log to console
                    logger.log('info', "[" + interaction.guild.name + "] " + interaction.user.username + " removed album \"" + albumUrl + "\"");
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
            if (config.music.savedAlbums && config.music.savedAlbums.length >= 1) {
                let albums = []
                config.music.savedAlbums.forEach(album => {
                    albums.push(album.name)
                })
                // Reply to user
                await interaction.reply(albums.join('\n'));
            }
            else {
                await interaction.reply("There are no saved albums currently");
            }
        }
    },
    async autocomplete(interaction, config) {
        if (interaction.options.getSubcommand() === 'remove') {
            const focusedValue = interaction.options.getFocused();
            const choices = config.music.savedAlbums;
            const filtered = choices.filter(choice => choice.name.startsWith(focusedValue));

            try {
                await interaction.respond(filtered);
            }
            catch (err) {
                logger.error(err.message);
            }
        }
    },
};