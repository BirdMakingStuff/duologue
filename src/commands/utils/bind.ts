import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { BindCourse, CourseExists, GetCourseBindings, CourseHasToken } from '../../ed/ed-handler.js';
import type { ChatCommand } from '../../types/command.js';

type ThreadBindingType = 'announcements' | 'normal';

export const command: ChatCommand = {
	data: new SlashCommandBuilder()
		.setName('bind')
		.setDescription('Binds an Ed Discussion course to the current Discord channel')
		.addIntegerOption(option => option.setName('course_id').setDescription('The ID of the Ed Discussion course').setRequired(true).setMinValue(1))
		.addStringOption(option => option.setName('thread_types').setDescription('If the channel subscribes to only announcements or only normal threads').setRequired(true).addChoices({ name: 'Announcements', value: 'announcements' }, { name: 'Normal', value: 'normal' })),

	async execute(interaction) {
		const courseId = interaction.options.getInteger('course_id');
		const threadType = interaction.options.getString('thread_types') as ThreadBindingType | null;

		if (!courseId || !threadType) {
			await interaction.reply({ content: '❌ Invalid course or thread type provided.', flags: MessageFlags.Ephemeral });
			return;
		}

		const channelId = interaction.channelId;
		if (!CourseExists(courseId) || !CourseHasToken(courseId)) {
			await interaction.reply({ content: `❌ Course with ID ${courseId} is not loaded into the bot.`, flags: MessageFlags.Ephemeral });
			return;
		}
		if (GetCourseBindings(courseId, threadType).includes(channelId)) {
			await interaction.reply({ content: `❌ Course with ID ${courseId} is already bound to this channel.`, flags: MessageFlags.Ephemeral });
			return;
		}
		try {
			BindCourse(courseId, channelId, threadType);
			await interaction.reply({ content: `✅ Course with ID ${courseId} has been bound to this channel successfully!` });
		} catch (error) {
			console.error(`[${(new Date()).toLocaleString()}] ${error}`);
			await interaction.reply({ content: '🚩 An error occurred while binding the course.', flags: MessageFlags.Ephemeral });
		}
	},
};