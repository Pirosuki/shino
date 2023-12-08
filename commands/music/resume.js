const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection } = require('@discordjs/voice');
const logger = require ('../../logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resume")
        .setDescription("Resume audio playback"),

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

            // Check if player is idle
            if (player.state.status !== 'paused') {
                // If it isn't then return error
                await interaction.reply({ content: "Audio playback isn't paused", ephemeral: true });
            }
            else {
                // Resume audio playback
                player.unpause();

                // Reply to user
                await interaction.reply("Playback resumed");

                // Log to console
                logger.log('info', "[" + interaction.guild.name + "] " + interaction.user.username + " resumed audio playback");
            }
        }
    },
};