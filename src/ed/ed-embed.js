import { EmbedBuilder } from "discord.js";

export default function EdEmbed(threadObj) {
    return new EmbedBuilder()
        .setColor('#50288c')
        .setTitle(threadObj.title)
        .setURL(`https://edstem.org/au/courses/${threadObj.course_id}/discussion/${threadObj.id}`)
        .setAuthor((threadObj.user_id === 0 || threadObj.is_anonymous) ? {name: `Anonymous #${threadObj.anonymous_id}`} : {name: threadObj.user.name, iconURL: (threadObj.user.avatar === null) ? null : `https://static.au.edusercontent.com/avatars/${threadObj.user.avatar}?s=128&fallback=1`}  )
        .setDescription((threadObj.document.length > 4096) ? threadObj.document.substring(0, 4096) : threadObj.document)
        .setFooter({text: (threadObj.type === 'question') ? `Question #${threadObj.number}` : `Post #${threadObj.number}`})
        .setTimestamp(Date.parse(threadObj.created_at));
}