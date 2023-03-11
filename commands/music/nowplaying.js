const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection } = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const logger = require ('../../logger.js');

const { getQueue } = require('./play.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("nowplaying")
        .setDescription("Get the current playing track"),

    async execute(interaction) {
        // Get voice connection
        let connection = getVoiceConnection(interaction.guild.id);

        // Checks if bot is connected to a voice channel
        if (!connection || interaction.member.voice.channelId !== connection.joinConfig.channelId) {
            // If not then return error
            await interaction.reply({ content: "We have to be in the same voice channel for you to use that command", ephemeral: true });
        }
        else {
            // Get queue
            getQueue(interaction)
            .then(guildQueue => {
                if (guildQueue.currentTrack !== undefined) {
                    // Formats track title, url and stuff into embed
                    const currentTrackEmbed = new EmbedBuilder()
                    .setTitle(track.title)
                    .setURL('https://youtu.be/' + track.id + '/')
                    .setThumbnail(track.thumbnail)
                    .addFields(
                        { name: 'Title', value: track.title },
                        { name: 'Requested by', value: track.user }
                    );

                    interaction.reply({ embeds: [currentTrackEmbed] });
                } 
                else {
                    // Else return that it's empty
                    interaction.reply("The queue is currently empty");
                }
            });
            // Log to console
            logger.log('info', "[" + interaction.guild.name + "] " + interaction.user.tag + " requested current track");
        }
    },
};