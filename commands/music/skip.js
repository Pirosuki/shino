const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection, AudioPlayer } = require('@discordjs/voice');
const logger = require ('../../logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("skip")
        .setDescription("Skip current track"),

    async execute(interaction) {
        // Get voice connection
        let connection = getVoiceConnection(interaction.guild.id);

        // Checks if bot is connected to a voice channel
        if (!connection || interaction.member.voice.channelId !== connection.joinConfig.channelId) {
            // If not then return error
            await interaction.reply({ content: "We have to be in the same voice channel for you to use that command", ephemeral: true });
        }
        else {
            // If it is, grab audio player
            const player = connection.state.subscription.player;

            // Check if player is already paused
            if (player.state.status == 'paused') {
                // If it is then return error
                await interaction.reply({ content: "Audio playback is paused", ephemeral: true });
            }
            else if (player.state.status == 'idle') {
                // If it is then return error
                await interaction.reply({ content: "There's nothing currently playing", ephemeral: true });
            }
            else {
                // Stop current audio playback to make it queue the next track
                player.stop();
                
                // Reply to user
                await interaction.reply("Track skipped");

                // Log to console
                logger.log('info', "[" + interaction.guild.name + "] " + interaction.user.username + " skipped a track");
            }
        }
    },
};