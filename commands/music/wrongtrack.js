const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection } = require('@discordjs/voice');
const logger = require ('../../logger.js');

const { getQueue } = require('./play.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("wrongtrack")
        .setDescription("Remove latest track added you added to the queue"),

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
                let index = 0;
                let indexList = [];
                guildQueue.tracks.forEach(track => {
                    if (track.user == interaction.user.username && !track.inAlbum) {
                        indexList.push(index);
                    }
                    
                    index += 1;
                });

                if (indexList.length > 0) {
                    trackIndex = indexList.pop();

                    let trackTitle = guildQueue.tracks[trackIndex].title;

                    guildQueue.tracks.splice(trackIndex, 1);

                    interaction.reply("Removed track \"" + trackTitle + "\" from the queue.");

                    // Log to console
                    logger.log('info', "[" + interaction.guild.name + "] " + interaction.user.username + " unadded a track");
                }
                else {
                    interaction.reply({ content: "Couldn't find the track, sorry", ephemeral: true });
                }
            });
        }
    },
};