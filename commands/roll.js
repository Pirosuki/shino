const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("roll")
        .setDescription("Rolls for a random number")
        .addIntegerOption(option =>
            option.setName('value')
                .setDescription("Max value of the dice roll, defaults to 100.")),

    async execute(interaction) {
        // Checks if a value was entered
        if (interaction.options.getInteger('value') !== null) {
            // If it was, then use that value as the max value
            maxValue = interaction.options.getInteger('value');
            value = randomInt(1, maxValue);
        }
        else {
            // If it wasn't, then default to 100
            value = randomInt(1, 100);
        }
        // Reply with result
        await interaction.reply(interaction.user.username + " rolled " + value + " points!");
        
        // Log action and result to console
        console.log("[" + interaction.guild.name + "] " + interaction.user.tag + " rolled a " + value + ".");
    },
};

// Function for creating a random integer
function randomInt(maxValue, minValue) {
    // Creates random integer with specified values and returns it to the caller
    return Math.floor(Math.random() * Math.ceil(maxValue - minValue)) + minValue
}