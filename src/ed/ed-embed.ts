import { EmbedBuilder, EmbedAuthorOptions } from 'discord.js';
import type { Thread } from './ed-handler.js';

export default function EdEmbed(threadObj: Thread): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor('#50288c')
        .setTitle(threadObj.title)
        .setURL(`https://edstem.org/au/courses/${threadObj.course_id}/discussion/${threadObj.id}`)
        .setDescription(threadObj.document.length > 4096 ? threadObj.document.substring(0, 4096) : threadObj.document)
        .setFooter({ text: threadObj.type === 'question' ? `Question #${threadObj.number}` : `Post #${threadObj.number}` })
        .setTimestamp(Date.parse(threadObj.created_at));

    const authorName = threadObj.user_id === 0 || threadObj.is_anonymous
        ? `Anonymous #${threadObj.anonymous_id ?? 'N/A'}`
        : threadObj.user?.name;

    if (authorName) {
        const author: EmbedAuthorOptions = {
            name: authorName,
            iconURL: threadObj.user?.avatar ? `https://static.au.edusercontent.com/avatars/${threadObj.user.avatar}?s=128&fallback=1` : undefined,
        };
        embed.setAuthor(author);
    }

    return embed;
}