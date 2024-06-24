const { SlashCommandBuilder } = require('discord.js');
const { GetThread } = require('../../ed/ed-handler.mjs');
const { EdEmbed } = require('../../ed/ed-embed.mjs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('getThread')
		.setDescription('Gets the content of a message from Ed Discussion.')
		.addIntegerOption(option => option.setName('thread_id').setDescription('The ID of the Ed Discussion thread').setRequired(true).setMinValue(1)),
	async execute(interaction) {
		const threadId = interaction.options.getInteger('thread_id');
		try {
			const threadObj = await GetThread(threadId);
			await interaction.reply({embed: EdEmbed(threadObj), ephemeral: false});
		} catch (error) {
			console.error(error);
			await interaction.reply({content: `❌ An error occurred while fetching the thread.`, ephemeral: true});
		}
	},
};