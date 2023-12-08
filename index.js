// Imports logger
const logger = require ('./logger.js');

// Check if correct version of node
nodeVerRegEx = new RegExp('^20.*');
if (!(nodeVerRegEx.test(process.versions.node))) {
    logger.error("Invalid node version, please install node 20")
    return
}


// Misc imports
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const packageJSON = require("./package.json");

// Refreshes log file and saves old
if (fs.existsSync('./logs/latest.log')) {
    fs.renameSync('./logs/latest.log', './logs/' + Date.now() + '.log');
}

let configMap = new Map();

// Imports bot token from "secrets.json" file, keep this secure
let secretsPath = "./config/secrets.json";
if (!fs.existsSync(secretsPath)) {
    throw("failed to retrieve secrets, make sure that /config contains both secrets.json and config.json");
}
const { token } = require(secretsPath);

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
    // Imports and or creates config files for each guild
    client.guilds.cache.forEach(guild => {
        let configPath = './config/guilds/' + guild.id + '.json';
        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(JSON.stringify('{"path": "' + configPath + '"}', null, 4), configPath);
        }
        let guildConfig = require(configPath);
        configMap.set(guild.id, guildConfig);
    })

    // Puts list of connected guilds into readable list
    const guildList = client.guilds.cache.map(guild => guild.name).join(", ");

    // Lists Nodejs and Disordjs versions for debug purposes
    logger.log("info", "Running Node.js version " + process.versions.node + " and Discord.js version " + packageJSON.dependencies["discord.js"] + ".");

    // Log connected
    logger.log("info", "Successfully connected as " + client.user.tag + " to " + guildList + ".");
});

// Command responses
client.on('interactionCreate', async interaction => {
    let command = client.commands.get(interaction.commandName);

    // Quick exit if there's no matching command
    if (!command) return;
    
    if (interaction.isAutocomplete()) {
        // Attempts to autocomplete command if supported
        try {
            await command.autocomplete(interaction, configMap.get(interaction.guildId));
        }
        // Catch error if something happens
        catch (error) {
            logger.error(error);
        }
    }

    // Second check
    if (!interaction.isCommand()) return;

    // Attempts to execute function of specific command
    try {
		await command.execute(interaction, configMap.get(interaction.guildId));
	}
    // Catch error if something happens
    catch (error) {
        logger.error(error);
	}
});

// This line starts the bot
client.login(token);