import { init, GetCourses, ReadCourse, GetCourseBindings, CourseHasToken } from './ed-handler.js';
import EdEmbed from './ed-embed.js';
import 'dotenv/config';

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
                // Skips courses without tokens
                if (!CourseHasToken(courseId)) {
                    continue;
                }
                // Reads courses
                ReadCourse(courseId).then(threads => {
                    for (const thread of threads) {
                        if (thread.user !== null) {
                            if (thread.user.course_role !== 'student') {
                                for (const channelId of GetCourseBindings(courseId, 'announcements')) {
                                    this.postMessage(channelId, thread);
                                }
                                continue;
                            }
                        }
                        for (const channelId of GetCourseBindings(courseId, 'normal')) {
                            this.postMessage(channelId, thread);
                        }
                    }
                }).catch(error => console.error(error));    
            }
        }, process.env.POLLING_INTERVAL);
    }

    postMessage(channelId, threadObj) {
        const channel = this.discordClient.channels.cache.get(channelId);
        if (!channel) {
            console.error(`Channel with ID ${channelId} not found.`);
            return;
        }
        try {
            channel.send({
                content: `**A new ${threadObj.type} has been posted on Ed Discussion:** [${threadObj.title}](${`https://edstem.org/au/courses/${threadObj.course_id}/discussion/${threadObj.id}`})`,
                embeds: [EdEmbed(threadObj)],
                ephemeral: false,
            });
        } catch (error) {
            console.error(error);
        }
    }
};

export default EdAdapter;