// Misc imports
const fs = require('fs');
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const packageJSON = require("./package.json");

// Imports bot token from "secrets.json" file, keep this secure.
const { token } = require('./secrets.json');

// Bot client, check intents if behaving unexpectedly
const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]});

// Grabs all the commands from the /commands folder
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// ^ Registers all the commands in the bot
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

// Bot connected and ready trigger
client.once('ready', () => {
    const guildList = client.guilds.cache.map(guild => guild.name).join(", ");

    // Lists Nodejs and Disordjs versions for debug purposes
    console.log("Running Node.js version " + process.versions.node + " and Discord.js version " + packageJSON.dependencies["discord.js"] + ".");

    // Log connected
    console.log("Successfully connected as " + client.user.tag + " to " + guildList + ".");
});

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
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'Command errored out, sorry!', ephemeral: true });
	}
});

// This line starts the bot
client.login(token)