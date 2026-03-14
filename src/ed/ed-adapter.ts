import { Client } from 'discord.js';
import { init, GetCourseIds, ReadCourse, GetCourseBindings, CourseHasToken, IsCourseWhitelisted, Thread } from './ed-handler.js';
import EdEmbed from './ed-embed.js';
import 'dotenv/config';
import { CONFIG } from '../config.js';

class EdAdapter {
    private readonly discordClient: Client;
    private readonly pollingIntervalMs: number;

    constructor(client: Client) {
        this.discordClient = client;
        const configuredInterval = Number(CONFIG["Behaviour"].polling_interval ?? 60000);
        this.pollingIntervalMs = Number.isNaN(configuredInterval) ? 60000 : configuredInterval;
        try {
            init();
        } catch (error) {
            console.error(error);
        }
    }

    poll(): void {
        setInterval(() => {
            for (const courseId of GetCourseIds()) {
                if (!IsCourseWhitelisted(courseId)) {
                    continue;
                }
                if (!CourseHasToken(courseId)) {
                    continue;
                }
                ReadCourse(courseId)
                    .then(threads => {
                        for (const thread of threads) {
                            if (thread.user !== null && thread.user.course_role !== 'student') {
                                for (const channelId of GetCourseBindings(courseId, 'announcements')) {
                                    void this.postMessage(channelId, thread);
                                }
                                continue;
                            }
                            for (const channelId of GetCourseBindings(courseId, 'normal')) {
                                void this.postMessage(channelId, thread);
                            }
                        }
                    })
                    .catch(error => console.error(error));
            }
        }, this.pollingIntervalMs);
    }

    private async postMessage(channelId: string, threadObj: Thread): Promise<void> {
        const channel = this.discordClient.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased() || !('send' in channel)) {
            console.error(`${(new Date()).toLocaleString()} Channel with ID ${channelId} not found or not text-based.`);
            return;
        }
        try {
            await channel.send({
                content: `**A new ${threadObj.type} has been posted on Ed Discussion:** [${threadObj.title}](${`https://edstem.org/au/courses/${threadObj.course_id}/discussion/${threadObj.id}`})`,
                embeds: [EdEmbed(threadObj)],
            });
        } catch (error) {
            console.error(`${(new Date()).toLocaleString()} ${error}`);
        }
    }
}

export default EdAdapter;