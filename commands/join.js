const { SlashCommandBuilder } = require('@discordjs/builders');
const { joinVoiceChannel } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("join")
        .setDescription("Make shino join the channel you're currently connected to"),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const adapterCreator = interaction.user;

        if (interaction.member.voice) {
            const voiceChannelId = interaction.member.voice.channelId

            console.log(guildId + " " + adapterCreator + " " + voiceChannelId)

            const connection = joinVoiceChannel({
                channelId: voiceChannelId,
                guildId: guildId,
                adapterCreator: adapterCreator,
            });
        }
        else {
            await interaction.reply("user not in voice channel");
            console.log("user not in voice channel")
        }

        console.log("[" + interaction.guild.name + "] " + "Joined voice as requsted by " + interaction.user.tag);
    },
};