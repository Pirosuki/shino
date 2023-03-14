// https://github.com/discordjs/discord.js/issues/5202

const { SlashCommandBuilder } = require('@discordjs/builders');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, NoSubscriberBehavior, getVoiceConnection, AudioPlayerStatus } = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');

// Imports logger
const logger = require ('../../logger.js');

const ytpl = require('ytpl');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');

// Import settings from config file
var config = require('../../config.json');

// Creates music queue
const queue = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a youtube track or album")
        .addStringOption(option =>
            option.setName("title")
                .setDescription("url or search terms for track")
                .setRequired(true)),

    async execute(interaction) {
        // Checks if user is connected to a valid voice channel
        if (config.music.validVoiceChannels.includes(interaction.member.voice.channelId)) {
            // if they are, check if the bot is connected and if so user and bot aren't in the same channel already
            if (!getVoiceConnection(interaction.guild.id) || interaction.member.voice.channelId !== getVoiceConnection(interaction.guild.id).joinConfig.channelId) {
                // If they aren't, connect bot to specified channel
                const connection = joinVoiceChannel({
                    channelId: interaction.member.voice.channelId,
                    guildId: interaction.guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    /*debug: true,*/
                });
            }

            // Grabs terms entered in command
            let terms = interaction.options.getString('title');

            // Attempts to figure out origin of entered url

            // Youtube album
            if (terms.includes('youtube.com/playlist?list=')) {
                albumYoutube(interaction, terms);
            }
            // Youtube track
            else if (terms.includes('youtu.be/') || terms.includes('youtube.com/watch?v=')) {
                if (terms.includes('?t')) {
                    terms = terms.slice(0, terms.indexOf('?t'));
                }
                trackYoutube(interaction, terms);
            }
            // SoundCloud album
            else if (terms.includes('soundcloud.com/') || terms.includes('/sets/')) {
                await interaction.reply("Identified SoundCloud album link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
            }
            // SoundCloud track
            else if (terms.includes('soundcloud.com/')) {
                await interaction.reply("Identified SoundCloud track link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
            }

            // Bandcamp album
            else if (terms.includes('bandcamp.com/album/')) {
                await interaction.reply("Identified Bandcamp album link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
            }
            // Bandcamp track
            else if (terms.includes('bandcamp.com/track/')) {
                await interaction.reply("Identified Bandcamp track link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
            }

            // Spotify album
            else if (terms.includes('open.spotify.com/album/') || terms.includes('open.spotify.com/album/')) {
                await interaction.reply("Identified Spotify album link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
                return
            }
            // Spotify track
            else if (terms.includes('open.spotify.com/track/')) {
                await interaction.reply("Identified Spotify track link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
            }

            // If no matches, default to searching for entered value
            else {
                searchYouTube(interaction, terms);
            }
        }
        else {
            // If not reply with error
            await interaction.reply({ content: "You have to be in a voice channel that allows music playback to use this command.", ephemeral: true });
        }
    },

    async getQueue(interaction) {
        // Grabs current queue
        let guildQueue = queue.get(interaction.guild.id);

        // Returns the queue
        return guildQueue;
    },
};

// Function for creating the audio player instance
async function createPlayer(interaction) {
    // Create player
    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Stop,
        },
    });

    // Grab voice connection
    const connection = getVoiceConnection(interaction.guild.id);
    
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
    queue.set(interaction.guild.id, guildQueue);
}

// Function to play the next track in queue
async function playNext(guildQueue) {
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

    // Get track info https://github.com/fent/node-ytdl-core/issues/902 highestaudio
    let ytdlURL = ytdl(track.id, {
        filter: "audioonly",
        fmt: "mp3",
        highWaterMark: 1 << 62,
        liveBuffer: 1 << 62,
        dlChunkSize: 0,
        bitrate: 128,
        quality: "lowestaudio",
    })
    ytdlURL.on('error', err => {
        // catch url related errors
        logger.error(err); 

        return
    });

    // Creates audio resource with track info
    resource = createAudioResource(ytdlURL, { inlineVolume: true });

    // Sets a more livable volume
    resource.volume.setVolume(config.music.volume / 100);

    // Plays the track
    guildQueue.player.play(resource);

    if (guildQueue.nowPlayingMsg) {
        try {
            guildQueue.nowPlayingMsg.delete();
        }
        catch (err) {
            console.log("failed to delete message func playNext");
            console.log(err);
        }
        guildQueue.nowPlayingMsg = undefined;
    }

    // Formats track title, url and stuff into embed
    const currentTrackEmbed = new EmbedBuilder()
    .setTitle(guildQueue.currentTrack.title)
    .setURL('https://youtu.be/' + guildQueue.currentTrack.id + '/')
    .setThumbnail(guildQueue.currentTrack.thumbnail)
    .addFields(
        { name: 'Title', value: guildQueue.currentTrack.title },
        { name: 'Requested by', value: guildQueue.currentTrack.user }
    );

    // Send a new now playing message and save it to the guild queue
    guildQueue.nowPlayingMsg = await guildQueue.textChannel.send({ embeds: [currentTrackEmbed] });
}

async function albumYoutube(interaction, url) {
    async function queueAlbumTrack(trackInfo){
        // Send to queue function
        if (trackInfo.isPlayable) {
            // Anti NEFFEX and switching vocals check
            if (trackInfo.title.toUpperCase().includes("NEFFEX") || trackInfo.title.toUpperCase().includes("SWITCHING VOCAL")) {
                return
            }

            // Format track info into variable
            const track = {
                title: trackInfo.title,
                id: trackInfo.id,
                user: interaction.user.tag,
                inAlbum: true,
                thumbnail: trackInfo.bestThumbnail.url.slice(0, trackInfo.bestThumbnail.url.indexOf('.jpg') + 4)
            };

            queueYouTube(interaction, track);
        }
    }

    ytpl(url, { limit: 20 })
    .then(albumInfo => {
        interaction.reply("Queueing album \"" + albumInfo.title + "\"");
        logger.log("info", "[" + interaction.guild.name + "] " + interaction.user.tag + " queued album \"" + albumInfo.title + "\"");

        albumInfo.items.forEach(trackInfo => {
            queueAlbumTrack(trackInfo);
        })

        ytpl(url, { limit: Infinity })
        .then(albumInfo => {
            let n = 0;
            albumInfo.items.forEach(trackInfo => {
                if (n < 20) { n++; return }

                queueAlbumTrack(trackInfo);
            });
        });
    })
    .catch(err => {
        let errorResponse;

        if (err == "Error: API-Error: The playlist does not exist.") {
            errorResponse = "Couldn't queue playlist, it's probably private";
        }
        else if (err == "Error: Unknown Playlist") {
            errorResponse = "Couldn't find a playlist with that url";
        }
        else {
            errorResponse = "Something went wrong, more info found in logs";
            // Log full error due to it being unknown
            logger.error(err);
        }

        // Inform user
        interaction.reply({ content: errorResponse, ephemeral: true });
    })
}

async function trackYoutube(interaction, url) {
    // Gets info of specified youtube url
    ytdl.getInfo(url)
    .then(info => {
        // Grab returned info
        let trackInfo = info.player_response.videoDetails;

        // Grab thumbnail url
        thumbnail = trackInfo.thumbnail.thumbnails[trackInfo.thumbnail.thumbnails.length - 1];

        // Format all track info into a variable
        const track = {
            title: trackInfo.title,
            id: trackInfo.videoId,
            user: interaction.user.tag,
            inAlbum: false,
            thumbnail: thumbnail.url
        }

    
        // Send to queue function
        queueYouTube(interaction, track);
    })
    .catch(err => {
        let errorResponse;

        if (err.statusCode == 410) {
            errorResponse = "Couldn't queue video, it's probably age restricted";
        }
        else if (err == "Error: This is a private video. Please sign in to verify that you may see it.") {
            errorResponse = "Couldn't queue video due to it being private";
        }
        else if (err == "Error: Video unavailable") {
            errorResponse = "Couldn't find a video with that url";
        }
        else {
            errorResponse = "Something went wrong, more info found in logs";
            // Log full error due to it being unknown
            logger.error(err);
        }

        // Inform user
        interaction.reply({ content: errorResponse, ephemeral: true });
    })

    .catch(error => {
        // Log error
        logger.error(error);

        // Inform user
        interaction.reply({ content: "Couldn't find a video with that url, sorry", ephemeral: true });
    })
}

// Function for handling youtube searches
async function searchYouTube(interaction, searchTerms) {
    // Add search terms
    const filters = await ytsr.getFilters(searchTerms);

    // Att filter to remove anything other than videos
    const filter = filters.get('Type').get('Video');

    // Option to only grab one result
    const options = { limit: 1, safeSearch: 1};

    // Search with required terms
    ytsr(filter.url, options).then(trackInfo => {
        // Check if there are results
        if (trackInfo.results == 0) {
            // Log error
            logger.error('Search for "' + searchTerms + '" yielded 0 results.');

            // Inform user
            interaction.reply({ content: "Search yielded no results, sorry", ephemeral: true });
            }
        else {
            // If there are then get first track // FIX // Maybe display results and let user pick
            trackInfo = trackInfo.items[0];

            // Format track info into variable
            const track = {
                title: trackInfo.title,
                id: trackInfo.id,
                user: interaction.user.tag,
                inAlbum: false,
                thumbnail: trackInfo.bestThumbnail.url.slice(0, trackInfo.bestThumbnail.url.indexOf('.jpg') + 4)
            };

            // Send to queue function
            queueYouTube(interaction, track);
        }
    })
}

// Function for adding youtube urls to the playback queue
async function queueYouTube(interaction, track) {
    // Grabs current queue
    let guildQueue = queue.get(interaction.guild.id);

    // If guildQueue didn't exist then create one
    if (!guildQueue) {
        createPlayer(interaction);
        guildQueue = queue.get(interaction.guild.id);
    }

    if (guildQueue.timeout) {
        clearTimeout(guildQueue.timeout);
        console.log("timeout cleared")
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
        playNext(guildQueue);

        // Once done get next track
        guildQueue.player.on(AudioPlayerStatus.Idle, () => {
            // Clear current track value from queue
            guildQueue.currentTrack = undefined;

            // Checks if queue has tracks in it and triggers disconnect timer if not
            if (guildQueue.tracks.length == 0) {
                async function disconnect() {
                    if (guildQueue.nowPlayingMsg) {
                        try {
                            guildQueue.nowPlayingMsg.delete();
                        }
                        catch (err) {
                            console.log("failed to delete message func disconnect");
                        }
    
                        guildQueue.nowPlayingMsg = undefined;
                    }

                    // Destroy voice connection
                    guildQueue.connection.destroy();

                    // Delete guild queue
                    queue.delete(interaction.guild.id);
                }

                if (guildQueue.nowPlayingMsg) {
                    try {
                        guildQueue.nowPlayingMsg.delete();
                    }
                    catch (err) {
                        console.log("failed to delete message func queueYoutube");
                    }

                    guildQueue.nowPlayingMsg = undefined;
                }

                // 1min timer to disconnect
                guildQueue.timeout = setTimeout(disconnect, 5 * 60 * 1000);
                console.log("timeout started");
            }
            else {
                // If it does, play the next track
                playNext(guildQueue);
            }
        });
    }

    // Reply and log queued track message if single track
    if (!track.inAlbum) {
        await interaction.reply("Queued track \"" + track.title + "\"");
        logger.log("info", "[" + interaction.guild.name + "] " + interaction.user.tag + " queued track \"" + track.title + "\"");
    }
}