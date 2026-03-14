import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { GetCourseInfo, GetThread } from '../../ed/ed-handler.js';
import EdEmbed from '../../ed/ed-embed.js';
import type { ChatCommand } from '../../types/command.js';

export const command: ChatCommand = {
	data: new SlashCommandBuilder()
		.setName('getthread')
		.setDescription('Gets the content of a message from Ed Discussion.')
		.addIntegerOption(option => option.setName('course_id').setDescription('The ID of the Ed Discussion course').setRequired(true).setMinValue(1))
		.addIntegerOption(option => option.setName('thread_id').setDescription('The ID of the Ed Discussion thread').setRequired(true).setMinValue(1)),

	async execute(interaction) {
		const courseId = interaction.options.getInteger('course_id');
		const threadId = interaction.options.getInteger('thread_id');
		if (!courseId || !threadId) {
			await interaction.reply({ content: '❌ Invalid course or thread ID provided.', flags: MessageFlags.Ephemeral });
			return;
		}
		try {
			const courseInfo = GetCourseInfo(courseId);
			if (!courseInfo || courseInfo.lastTimestamp === 0) {
				await interaction.reply({ content: `❌ Course with ID ${courseId} is not loaded into the bot.`, flags: MessageFlags.Ephemeral });
				return;
			}
			const threadObj = await GetThread(courseId, threadId);
			await interaction.reply({
				content: `**[[${courseInfo.name}]:](https://edstem.org/au/courses/${threadObj.course_id}/discussion/)** [${threadObj.title}](${`https://edstem.org/au/courses/${threadObj.course_id}/discussion/${threadObj.id}`})`,
				embeds: [EdEmbed(threadObj)],

			});
		} catch (error) {
			console.error(`${(new Date()).toLocaleString()} ${error}`);
			await interaction.reply({ content: '🚩 An error occurred while fetching the thread.', flags: MessageFlags.Ephemeral });
		}
	},
};