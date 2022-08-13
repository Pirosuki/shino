const fs = require('fs');const { REST } = require('@discordjs/rest');
const path = require('path');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token } = require('./secrets.json');

// Variable for holding commands
let commands = [];

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

// Gets all commands and puts them in the commands variable
for (const file of getCommands('./commands')) {
	const command = require('./' + file);
	commands.push(command.data.toJSON());
}

// Connects with token
const rest = new REST({ version: '9' }).setToken(token);

// Pushes new commands
rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
    .then(() => console.log("Successfully registered commands."))
    .catch(console.error);