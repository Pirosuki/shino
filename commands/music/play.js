// https://github.com/discordjs/discord.js/issues/5202

const { SlashCommandBuilder } = require('@discordjs/builders');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, NoSubscriberBehavior, getVoiceConnection, AudioPlayerStatus } = require('@discordjs/voice');
const { EmbedBuilder, ActivityType } = require('discord.js');

// Imports logger
const logger = require ('../../logger.js');

const playdl = require('play-dl');

// Creates music queue
const queue = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a youtube track or album")
        .addStringOption(option =>
            option.setName("title")
                .setDescription("url or search terms for track")
                .setRequired(true)
                .setAutocomplete(true)),

    async execute(interaction, config) {
        // Checks if user is connected to a valid voice channel
        if (config.music.validVoiceChannels.includes(interaction.member.voice.channelId)) {
            // if they are, check if the bot is connected and if so user and bot aren't in the same channel already
            if (!getVoiceConnection(interaction.guildId) || interaction.member.voice.channelId !== getVoiceConnection(interaction.guildId).joinConfig.channelId) {
                // If they aren't, connect bot to specified channel
                const connection = joinVoiceChannel({
                    channelId: interaction.member.voice.channelId,
                    guildId: interaction.guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    debug: true,
                });
            }

            // Grabs terms entered in command
            let terms = interaction.options.getString('title');

            // Attempts to figure out origin of entered url

            // Youtube album
            if (terms.includes('youtube.com/playlist?list=')) {
                albumYoutube(interaction, config, terms);
            }
            // Youtube track
            else if (terms.includes('youtu.be/') || terms.includes('youtube.com/watch?v=')) {
                if (terms.includes('?t')) {
                    terms = terms.slice(0, terms.indexOf('?t'));
                }
                trackYoutube(interaction, config, terms);
            }
            // SoundCloud album
            else if (terms.includes('soundcloud.com/') || terms.includes('/sets/')) {
                await interaction.reply("Identified SoundCloud album link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.username + " as it wasn't from a supported website");
            }
            // SoundCloud track
            else if (terms.includes('soundcloud.com/')) {
                await interaction.reply("Identified SoundCloud track link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.username + " as it wasn't from a supported website");
            }

            // Bandcamp album
            else if (terms.includes('bandcamp.com/album/')) {
                await interaction.reply("Identified Bandcamp album link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.username + " as it wasn't from a supported website");
            }
            // Bandcamp track
            else if (terms.includes('bandcamp.com/track/')) {
                await interaction.reply("Identified Bandcamp track link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.username + " as it wasn't from a supported website");
            }

            // Spotify album
            else if (terms.includes('open.spotify.com/album/') || terms.includes('open.spotify.com/album/')) {
                await interaction.reply("Identified Spotify album link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.username + " as it wasn't from a supported website");
                return
            }
            // Spotify track
            else if (terms.includes('open.spotify.com/track/')) {
                await interaction.reply("Identified Spotify track link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.username + " as it wasn't from a supported website");
            }

            // If no matches, default to searching for entered value
            else {             
                searchYouTube(interaction, config, terms);
            }
        }
        else {
            // If not reply with error
            await interaction.reply({ content: "You have to be in a voice channel that allows music playback to use this command.", ephemeral: true });
        }
    },

    async autocomplete(interaction, config) {
        const searchTerms = interaction.options.getFocused();
        if (searchTerms.length > 0) {
            playdl.search(searchTerms, { limit: 5, source: {youtube: "video"} })
            .then(searchResults => {
                let trackList = [];
                searchResults.forEach(track => {
                    let trackInfoFormatted = {
                        "name": track.title,
                        "value": "https://youtu.be/" + track.id
                    }
                    trackList.push(trackInfoFormatted);
                })
                interaction.respond(trackList);
            })
        }
        else {
            const choices = config.music.savedAlbums;

            try {
                await interaction.respond(choices);
            }
            catch (err) {
                logger.error(err);
            }
        }
    },

    async getQueue(interaction) {
        // Grabs current queue
        let guildQueue = queue.get(interaction.guildId);

        // Returns the queue
        return guildQueue;
    },
};

// Function for creating the audio player instance
async function createPlayer(interaction, config) {
    // Create player
    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Stop,
        },
    });

    // Grab voice connection
    const connection = getVoiceConnection(interaction.guildId);
    
    // Attempt to connect voice connection to audio player
    connection.subscribe(player);

    // Creates queue for current guild
    let guildQueue = {
        player: player,
        connection: connection,
        timeout: false,
        voiceChannel: interaction.member.voice.channel,
        textChannel: interaction.channel,
        nowPlayingMsg: undefined,
        currentTrack: undefined,
        tracks: [],
        loop: false,
        shuffle: false
    }

    // Adds queue to queue variable
    queue.set(interaction.guildId, guildQueue);

    // Watch for idle
    guildQueue.player.on(AudioPlayerStatus.Idle, () => {
        idleTrigger(interaction, config, guildQueue)
    });

    // Watch for playing
    guildQueue.player.on(AudioPlayerStatus.Playing, () => {
        // Clear disconnect timer
        if (guildQueue.timeout) {
            clearTimeout(guildQueue.timeout);
        }

        // Formats track title, url and stuff into embed
        const currentTrackEmbed = new EmbedBuilder()
        .setTitle(guildQueue.currentTrack.title)
        .setURL('https://youtu.be/' + guildQueue.currentTrack.id + '/')
        .setThumbnail(guildQueue.currentTrack.thumbnail)
        .addFields(
            { name: 'Requested by', value: guildQueue.currentTrack.user }
        );

        // Send a new now playing message and save it to the guild queue
        guildQueue.textChannel.send({ embeds: [currentTrackEmbed] })
        .then (nowPlayingMsg => {
            guildQueue.nowPlayingMsg = nowPlayingMsg; // shino gets mad because the promise is sometimes pending when trying to delete the message, this might help?
        })

        if (interaction.guildId = '423159363491069953') {
            if (interaction.guildId = '423159363491069953') {
                interaction.client.user.setPresence({
                    activities: [{ name: guildQueue.currentTrack.title, type: ActivityType.Streaming, url: 'https://www.youtube.com/watch?v=' + guildQueue.currentTrack.id + '/'}]
                })
            }
        }
    });
}

// Function to trigger when idle
async function idleTrigger(interaction, config, guildQueue) {
    // Set current status to idle
    if (interaction.guildId = '423159363491069953') {
        interaction.client.user.setPresence({ activities: null });
    }

    // Clear current track value from queue
    guildQueue.currentTrack = undefined;

    // Remove nowPlayingMsg if it exists
    if (guildQueue.nowPlayingMsg) {
        try {
            guildQueue.nowPlayingMsg.delete();
        }
        catch (err) {
            logger.error(err);
        }

        guildQueue.nowPlayingMsg = undefined;
    }

    // Checks if queue has tracks in it and triggers disconnect timer if not
    if (guildQueue.tracks.length == 0) {
        // Start disconnect timer
        guildQueue.timeout = setTimeout(disconnect, 5 * 60 * 1000);

        async function disconnect() {
            
            try {
                // Destroy voice connection
                guildQueue.connection.destroy();
            }
            catch (err) {
                logger.error(err);
            }

            // Delete guild queue
            queue.delete(interaction.guildId);
        }
    }
    else {
        // If it does, play the next track
        playNext(interaction, config, guildQueue);
    }
}

// Function to play the next track in queue
async function playNext(interaction, config, guildQueue) {
    let track;
    // Check whether shuffle is on
    if (guildQueue.shuffle) {
        let notInAlbumIndex = 0;
        let notInAlbumIndexList = [];
        guildQueue.tracks.forEach(track => {
            if (!track.inAlbum) {
                notInAlbumIndexList.push(notInAlbumIndex);
            }
            
            notInAlbumIndex += 1;
        });

        let randomMax;
        if (notInAlbumIndexList.length) {
            randomMax = notInAlbumIndexList[notInAlbumIndexList.length - 1];
        }
        else {
            randomMax = guildQueue.tracks.length
        }
        // If it is, grab a random track
        // Creates random number
        
        let index = Math.floor(
            Math.random() * randomMax
        )

        // Grabs track based on that number
        track = guildQueue.tracks[index];

        // Removes that track from the queue
        guildQueue.tracks.splice(index, 1);
    }
    else {
        // If not, grab the latest track and remove it from the queue
        track = guildQueue.tracks.shift();
    }

    // Readds track to end of queue if loop == true
    if (guildQueue.loop) {
        guildQueue.tracks.push(track);
    }

    // Sets currentTrack value
    guildQueue.currentTrack = track;

    // Get track info
    await playdl.stream(track.id)
    .then(stream => {
        // Creates audio resource with track info
        resource = createAudioResource(stream.stream, { inputType: stream.type, inlineVolume: true });

        // Sets a more livable volume
        resource.volume.setVolume(config.music.volume / 100);

        // Attempts to play the track
        try {
            guildQueue.player.play(resource);
        }
        catch (err) {
            logger.error(err);
        }
    })
    .catch(err => {
        if (err.message.includes('Sign in to confirm your age')) {
            logger.log("info", "[" + interaction.guild.name + "] " + "Skipped age restricted song \"" + track.title + "\" with id \"" + track.id + "\"");
        }
        else {
            logger.error(err);
        }

        // Trigger idle to keep going
        idleTrigger(interaction, config, guildQueue);
    });
}

async function albumYoutube(interaction, config, url) {
    async function queueAlbumTrack(trackInfo){
        // Send to queue function
        let flagged;
        config.music.filters.forEach(filter => {
            if (trackInfo.title.toLowerCase().includes(filter.toLowerCase()) || trackInfo.id == filter) {
                flagged = true;
            };
        })
        if (flagged) {
            return
        }

        // Format track info into variable
        const track = {
            title: trackInfo.title,
            id: trackInfo.id,
            user: interaction.user.username,
            inAlbum: true,
            thumbnail: trackInfo.thumbnails.slice(-1)[0].url
        };

        queueTrack(interaction, config, track);
    }

    playdl.playlist_info(url, { incomplete: true })
    .then(albumInfo => {
        interaction.reply("Queueing album \"" + albumInfo.title + "\"");
        logger.log("info", "[" + interaction.guild.name + "] " + interaction.user.username + " queued album \"" + albumInfo.title + "\"");

        albumInfo.videos.forEach(trackInfo => {
            queueAlbumTrack(trackInfo);
        })

        albumInfo.all_videos()
        .then(albumInfo => {
            let n = 0;
            albumInfo.forEach(trackInfo => {
                if (n < 100) { n++; return }

                queueAlbumTrack(trackInfo);
            });
        });
    })
    .catch(err => {
        logger.error(err);

        // Inform user
        interaction.reply({ content: "brokie", ephemeral: true });
    })
}

async function trackYoutube(interaction, config, url) {
    // Gets info of specified youtube url
    playdl.video_info(url)
    .then(trackInfo => {
        // Grab returned info
        trackInfo = trackInfo.video_details;

        // Format all track info into a variable
        const track = {
            title: trackInfo.title,
            id: trackInfo.id,
            user: interaction.user.username,
            inAlbum: false,
            thumbnail: trackInfo.thumbnails.slice(-1)[0].url
        }

    
        // Send to queue function
        queueTrack(interaction, config, track);
    })
    .catch(err => {
        let errorMessage;

        if (err.message.includes("This is not a YouTube Watch URL")) {
            errorMessage = "Invalid YouTube URL";
        }
        else if (err.message.includes('Sign in to confirm your age')) {
            errorMessage = "Track is age restricted";
        }
        else if (err.message.includes('Private video')) {
            errorMessage = "Track is private";
        }
        else {
            errorMessage = "Brokie";

            logger.error(err);
        }

        // Inform user
        interaction.reply({ content: errorMessage, ephemeral: true });
    })
}

// Function for handling youtube searches
async function searchYouTube(interaction, config, searchTerms) {
    // Search with required terms
    playdl.search(searchTerms, { limit: 1, source: {youtube: "video"} })
    .then(searchResults => {
        // Checks if there are any results
        if (searchResults.length > 0) {
            // If there are then get first track
            let trackInfo = searchResults[0];

            // Format track info into variable
            const track = {
                title: trackInfo.title,
                id: trackInfo.id,
                user: interaction.user.username,
                inAlbum: false,
                thumbnail: trackInfo.thumbnails.slice(-1)[0].url
            };

            // Send to queue function
            queueTrack(interaction, config, track);
        }
        else {
            interaction.reply({ content: "Search yielded no results", ephemeral: true });
        }
    })
}

// Function for adding youtube urls to the playback queue
async function queueTrack(interaction, config, track) {
    // Grabs current queue
    let guildQueue = queue.get(interaction.guildId);

    // If guildQueue didn't exist then create one
    if (!guildQueue) {
        createPlayer(interaction, config);
        guildQueue = queue.get(interaction.guildId);
    }
    
    // Add track to queue
    if (!track.inAlbum) {
        let inAlbumIndex = 0;
        let inAlbumIndexList = [];
        guildQueue.tracks.forEach(track => {
            if (track.inAlbum) {
                inAlbumIndexList.push(inAlbumIndex);
            }
            
            inAlbumIndex += 1;
        });

        if (inAlbumIndexList.length) {
            guildQueue.tracks.splice(inAlbumIndexList[0], 0, track);
        }
        else {
            guildQueue.tracks.push(track);
        }
    }
    else {
        guildQueue.tracks.push(track);
    }

    // Check if there's already a track playing
    if (!guildQueue.currentTrack) {
        // If not then start playing this track
        playNext(interaction, config, guildQueue);
    }

    // Reply and log queued track message if single track
    if (!track.inAlbum) {
        await interaction.reply("Queued track \"" + track.title + "\"");
        logger.log("info", "[" + interaction.guild.name + "] " + interaction.user.username + " queued track \"" + track.title + "\"");
    }
}