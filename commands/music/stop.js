const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop current audio playback and clear queue"),

    async execute(interaction) {
        // Get voice connection
        const connection = getVoiceConnection(interaction.guild.id);

        // Get audio player
        const player = connection.state.subscription.player;

        // Checks that the connection is valid and that the connection matches between user and bot
        if (!connection || interaction.member.voice.channelId !== connection.joinConfig.channelId) {
            // If not then return error
            await interaction.reply({ content: "We have to be in the same voice channel for you to use that command", ephemeral: true });
        }
        // Check if player is idle
        else if (player.Idle) {
            // If it is then return error
            await interaction.reply({ content: "Nothing is currently playing", ephemeral: true });
        }
        else {
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