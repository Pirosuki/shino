// Misc imports
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const packageJSON = require("./package.json");

// Imports bot token from "secrets.json" file, keep this secure
const { token } = require('./secrets.json');

// Bot client, check intents if behaving unexpectedly
const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]});

// Collection for commands
client.commands = new Collection();

// Function for getting all command files
function getCommands(dir, fileList) {
    // Gets list of files in specified dir
    files = fs.readdirSync(dir);

    // Variable for files
    fileList = [];

    files.forEach(file => {
        // Checks if file is folder
        if (fs.statSync(dir + '/' + file).isDirectory()) {
            // If it is, check for more files in that folder
            fileList = getCommands(dir + '/' + file, fileList);
        }
        else {
            // If not, add file to file list
            fileList.push(path.join(dir, '/', file));
        }
    })

    // Filters out non .js files
    let commands = fileList.filter(file => file.endsWith('.js'));

    // Returns list of command files
    return commands;
}

// ^ Registers all the commands in the bot
for (const file of getCommands('./commands')) {
	const command = require('./' + file);
	client.commands.set(command.data.name, command);
}

// Bot connected and ready trigger
client.once('ready', () => {
    // Puts list of connected guilds into readable list
    const guildList = client.guilds.cache.map(guild => guild.name).join(", ");

    // Lists Nodejs and Disordjs versions for debug purposes
    console.log("Running Node.js version " + process.versions.node + " and Discord.js version " + packageJSON.dependencies["discord.js"] + ".");

    // Log connected
    console.log("Successfully connected as " + client.user.tag + " to " + guildList + ".");
});

// Simple error catcher
client.on('error', error => {
    console.log(error);
})

// Command responses
client.on('interactionCreate', async interaction => {
    // Quick exit if there's no matching command
    if (!interaction.isCommand()) return;

    // ^
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Attempts to execute function of specific command
    try {
		await command.execute(interaction);
	}
    // Catch error if one happens, maybe add a function to save error to log file here
    catch (error) {
		console.error(error);
		await interaction.reply({ content: 'Command errored out, sorry!', ephemeral: true });
	}
});

// This line starts the bot
client.login(token)