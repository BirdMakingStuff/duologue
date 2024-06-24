import { SlashCommandBuilder } from 'discord.js';
import { GetThread } from '../../ed/ed-handler.js';
import EdEmbed from '../../ed/ed-embed.js';

export const command = {
	data: new SlashCommandBuilder()
	.setName('getthread')
	.setDescription('Gets the content of a message from Ed Discussion.')
	.addIntegerOption(option => option.setName('thread_id').setDescription('The ID of the Ed Discussion thread').setRequired(true).setMinValue(1)),

	async execute(interaction) {
		const threadId = interaction.options.getInteger('thread_id');
		try {
			const threadObj = await GetThread(threadId);
			await interaction.reply({ embed: EdEmbed(threadObj), ephemeral: false });
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: `❌ An error occurred while fetching the thread.`, ephemeral: true });
		}
	}
};