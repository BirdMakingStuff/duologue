const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Checks ping'),
	async execute(interaction) {
		const sent = await interaction.reply({content: 'Pong!', fetchReply: true});
		await interaction.editReply(`Pong! Latency is ${sent.createdTimestamp - interaction.createdTimestamp}ms.`);
	},
};