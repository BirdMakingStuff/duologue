import { init, GetCourses, ReadCourse, GetCourseBindings } from './ed-handler.mjs';
import { Client, GatewayIntentBits, Collection, Events, EmbedBuilder } from 'discord.js';
import EdEmbed from './ed-embed.mjs';

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
                ReadCourse(courseId).then(threads => {
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
                }).catch(error => console.error(error));    
            }
        }, 180000);
    }

    postMessage(channelId, threadObj) {
        const channel = this.discordClient.channels.cache.get(channelId);
        if (!channel) {
            console.error(`Channel with ID ${channelId} not found.`);
            return;
        }
        channel.send({
            content: `**A new ${threadObj.type} has been posted on Ed Discussion**: [${threadObj.title}](${`https://edstem.org/au/courses/${threadObj.course_id}/discussion/${threadObj.id}`})`,
            embed: EdEmbed(threadObj),
            ephemeral: false,
        });
    }
};

export default EdAdapter;