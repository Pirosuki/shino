const { SlashCommandBuilder } = require('@discordjs/builders');
const { createAudioPlayer, createAudioResource, getVoiceConnection } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Have shino play audio from a specific url")
        .addStringOption(option =>
            option.setName("url")
                .setDescription("URL for media")
                .setRequired(true)),

    async execute(interaction) {
        let url = interaction.options.get("url").value;
        let resource;

        if (url.includes('youtu.be/') || url.includes('youtube.com/watch?v=')) {
            if (url.includes('?t')) {
                url = url.slice(0, url.indexOf('?t'));
            }
            resource = createAudioResource(ytdl(url));
        }
        else {
            await interaction.reply("I can only play youtube links, sorry.");
            console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't a youtube link");
            return
        }

        const player = createAudioPlayer();

        const connection = getVoiceConnection(interaction.guildId);
        
        try {
            connection.subscribe(player);
        }
        catch (TypeError) {
            await interaction.reply({ content: "Couldn't play as I'm not currently in a voice channel", ephemeral: true })
            return
        }

        player.play(resource);

        console.log("ababa");
        await interaction.reply("ababa");
    },
};