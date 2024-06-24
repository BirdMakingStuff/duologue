import { init, GetCourses, ReadCourse, GetCourseBindings } from './ed-handler.mjs';
import { Client, GatewayIntentBits, Collection, Events, EmbedBuilder } from 'discord.js';

class EdAdapter {
    constructor(client) {
        this.discordClient = client;
        try {
            init();
        } catch (error) {
            console.error(error);
            return;
        }
    }
    
    poll() {
        setInterval(() => {
            for (const courseId of GetCourses() ) {
                const threads = ReadCourse(courseId);
                for (const thread of threads) {
                    if (thread.user !== null) {
                        if (thread.user.course_role !== 'student') {
                            for (const channelId in GetCourseBindings(courseId, 'announcements')) {
                                this.postMessage(channelId, thread);
                            }
                            continue;
                        }
                    }
                    for (const channelId in GetCourseBindings(courseId, 'normal')) {
                        this.postMessage(channelId, thread);
                    }
                }
            }
        }, 180000);
    }

    postMessage(channelId, threadObj) {
        const channel = this.discordClient.channels.cache.get(channelId);
        if (!channel) {
            console.error(`Channel with ID ${channelId} not found.`);
            return;
        }
        const embed = new EmbedBuilder()
        .setColor('#50288c')
        .setTitle(threadObj.title)
        .setURL(`https://edstem.org/au/courses/${threadObj.course_id}/discussion/${threadObj.id}`)
        .setAuthor((threadObj.user === null) ? {name: `Anonymous ${threadObj.anonymous_id}`} : {name: threadObj.user.name, iconURL: (threadObj.user.avatar === null) ? null : `https://static.au.edusercontent.com/avatars/${threadObj.user.avatar}?s=128&fallback=1`}  )
        .setDescription((string.length > 4096) ? threadObj.document.substring(0, 4096) : threadObj.document)
        .setFooter({text: (threadObj.type === 'question') ? `Question #${threadObj.number}` : `Post ${threadObj.number}`})
        .setTimestamp(Date.parse(threadObj.created_at));
        channel.send({
            content: `**A new ${threadObj.type} has been posted on Ed Discussion**: [${threadObj.title}](${`https://edstem.org/au/courses/${threadObj.course_id}/discussion/${threadObj.id}`})`,
            embed: embed
        });
    }
};

export default EdAdapter;