import { Client } from 'discord.js';
import { isAxiosError } from 'axios';
import { init, GetCourseIds, ReadCourse, GetCourseBindings, CourseHasToken, IsCourseWhitelisted, Thread } from './ed-handler.js';
import EdEmbed from './ed-embed.js';
import 'dotenv/config';
import { CONFIG } from '../config.js';

class EdAdapter {
    private readonly discordClient: Client;
    private readonly pollingIntervalMs: number;
    private pollingCourses: Set<string> = new Set();

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
                const idString = courseId.toString();
                if (!IsCourseWhitelisted(idString) || !CourseHasToken(idString)) {
                    continue;
                }
                if (this.pollingCourses.has(idString)) {
                    continue;
                }
                this.pollingCourses.add(idString);
                this.pollCourseWithRetry(idString)
                    .finally(() => this.pollingCourses.delete(idString));
            }
        }, this.pollingIntervalMs);
    }

    private isTransientError(error: unknown): boolean {
        if (!isAxiosError(error)) {
            return false;
        }
        if (error.response) {
            const status = error.response.status;
            return status === 429 || status >= 500;
        }
        if (error.code) {
            return ['ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'ECONNREFUSED'].includes(error.code);
        }
        return false;
    }

    private async pollCourseWithRetry(courseId: string): Promise<void> {
        let attempt = 0;
        const maxRetries = 5;

        while (true) {
            try {
                const threads = await ReadCourse(courseId);
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
                break;
            } catch (error) {
                if (!this.isTransientError(error) || attempt >= maxRetries) {
                    console.error(`[${(new Date()).toLocaleString()}] Final failure polling course ${courseId}:`, error);
                    break;
                }
                attempt++;
                const delayMs = 2000 * Math.pow(2, attempt - 1);
                console.warn(`[${(new Date()).toLocaleString()}] Transient failure polling course ${courseId}. Retrying in ${delayMs}ms (Attempt ${attempt}/${maxRetries}).`);
                await new Promise(res => setTimeout(res, delayMs));
            }
        }
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