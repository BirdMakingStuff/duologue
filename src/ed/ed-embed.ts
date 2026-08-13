import { EmbedBuilder, EmbedAuthorOptions } from 'discord.js';
import type { Thread } from './ed-handler.js';


const ED_ANIMALS = [
    'Overcaffeinated Goblin',
    'Degree Regretter',
    'All-Nighter Champion',
    'Code Compiler Pray-er',
    'Deadline Dodger',
    'StackOverflow Copy-Paster',
    'Group Project Carry',
    'Tears-in-the-Lab Enabler',
    'ChatGPT Dependent',
    'Procrastination Legend'
];

export default function EdEmbed(threadObj: Thread): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor('#50288c')
        .setTitle(threadObj.title)
        .setURL(`https://edstem.org/au/courses/${threadObj.course_id}/discussion/${threadObj.id}`)
        .setDescription(threadObj.document.length > 4096 ? threadObj.document.substring(0, 4096) : threadObj.document)
        .setFooter({ text: threadObj.type === 'question' ? `Question #${threadObj.number}` : `Post #${threadObj.number}` })
        .setTimestamp(Date.parse(threadObj.created_at));

    // 2. Updated author logic to inject your funny titles
    let authorName = threadObj.user?.name;

    if (threadObj.user_id === 0 || threadObj.is_anonymous) {
        const anonId = threadObj.anonymous_id;
        
        if (anonId !== undefined && anonId !== null) {
            // Pick a funny name consistently using the ID math
            const animalIndex = anonId % ED_ANIMALS.length;
            const animal = ED_ANIMALS[animalIndex];
            authorName = `Anonymous ${animal} (#${anonId})`;
        } else {
            authorName = 'Anonymous User';
        }
    }

    if (authorName) {
        const author: EmbedAuthorOptions = {
            name: authorName,
            iconURL: threadObj.user?.avatar ? `https://static.au.edusercontent.com/avatars/${threadObj.user.avatar}?s=128&fallback=1` : undefined,
        };
        embed.setAuthor(author);
    }

    return embed;
}