const { SlashCommandBuilder } = require('@discordjs/builders');
const { joinVoiceChannel } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("join")
        .setDescription("Have shino join the channel you're currently connected to"),

    async execute(interaction) {
        const voiceChannelId = interaction.member.voice.channelId;
        const guildId = interaction.guildId;
        const voiceAdapterCreator = interaction.guild.voiceAdapterCreator;

        if (voiceChannelId !== null) {
            const connection = joinVoiceChannel({
                channelId: voiceChannelId,
                guildId: guildId,
                adapterCreator: voiceAdapterCreator,
            });

            await interaction.reply("Joined channel <#" + voiceChannelId + ">");
            console.log("[" + interaction.guild.name + "] " + "Joined voice as requsted by " + interaction.user.tag);
        }
        else {
            await interaction.reply({content: "Couldn't join as you're not currently in a voice channel", ephemeral: true });
            console.log("[" + interaction.guild.name + "] " + "Failed to join voice channel as " + interaction.user.tag + " was not in a voice channel")
        }
    },
};