const fs = require('fs');
const { Client, Collection, Intents, Guild } = require("discord.js");
const { token } = require('./secrets.json');
const packageJSON = require("./package.json");

const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]});

// Grabs all the commands from the /commands folder
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// ^
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

client.once('ready', () => {
    const guildList = client.guilds.cache.map(guild => guild.name).join(", ");

    console.log("Running Node.js version " + process.versions.node + " and Discord.js version " + packageJSON.dependencies["discord.js"] + ".");
    console.log("Successfully connected as " + client.user.tag + " to " + guildList + ".");
});

// Text responses
client.on('messageCreate', async message => {
    if (message.author.id === client.user.id) return;

    if (message.content.toUpperCase().includes("BREAD")) {
        await message.reply("🥖");
        console.log("[" + message.guild.name + "] " + "Donated some bread to the starving " + message.author.tag);
    }
    else if (message.content.toUpperCase().includes("BAGUETTE")) {
        await message.reply("🍞");
        console.log("[" + message.guild.name + "] " + "Donated some fake bread to the starving " + message.author.tag);
    }
})

// Command responses
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'Command errored out, sorry!', ephemeral: true });
	}
});

client.login(token)