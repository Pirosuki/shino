const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop current audio playback and clear queue"),

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

            // Stop audio playback
            player.stop();

            // Clear queue // FIX //

            // Reply to user
            await interaction.reply("Playback stopped and queue (not really) cleared");

            // Log to console
            console.log("[" + interaction.guild.name + "] " + interaction.user.tag + " stopped audio playback.");
        }
    },
};