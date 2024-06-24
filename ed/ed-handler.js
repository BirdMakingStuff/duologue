// requiring required packages
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import 'dotenv/config';

// set axios defaults
axios.defaults.baseURL = 'https://edstem.org/api/';

// setting dirname
const __dirname = import.meta.dirname;

/*
let ed_axios = axios.create({
    baseURL: 'https://edstem.org/api/',
    timeout: 1000,
    headers: { Authorization: `Bearer ${token}` },
});
*/

// load course tokens
const course_tokens_txt = fs.readFileSync(path.join(__dirname, 'ed-tokens.json'), 'utf-8');
const course_tokens = JSON.parse(course_tokens_txt);

// ed_storage contains storage info regarding the handler.
let ed_storage;

// NOTE: websockets on ed do not work with api keys :(
// a web socket is opened to listen for new unreads (wss://notes.au.edstem.org/api/browser/websock?access_token=<X-Token>)
/* example response:
data: {last_open: "2024-06-11T15:27:49.014152+10:00", unread: 0},
type: "init",
*/
// another web socket is opened to listen to continue looking for unreads (wss://edstem.org/api/stream?_token=<X-Token>)
// this web socket can have various responses, but we can compare against the type property and check if it is thread.unreadCounts.
/* example message:
{"id":13,"type":"thread.unreadCounts"}
*/
/* example response:
data: {12328: {unread: 0}, 12358: {unread: 0}, 12361: {unread: 0}, 12412: {unread: 0}, 12443: {unread: 0},…}
id: 8
type: "thread.unreadCounts"
*/
/*
to get a list of users, GET request https://edstem.org/api/user
*/
/*example response:
courses:
<list of course objects. an example>
"course": {
                "id": 15580,
                "realm_id": 47,
                "code": "ENGSCI 211",
                "name": "Mathematical Modelling 2",
                "year": "2024",
                "session": "Semester 1",
                "status": "archived", // can also be "inactive" if not set up or "active" if it is
}
realms: defines the organisations that people are in.
user: describes the logged in user
*/

export async function ReadUser() {
    const tokens = [];
    for (const [_, token] of Object.entries(course_tokens)) {
        // Only get courses that have not been indexed yet.
        console.log(`Reading user with token ${token}`);
        if (tokens.indexOf(token) !== -1) {
            continue;
        }
        try {
            const response = await axios.get('/user',  { headers: { 'Authorization': `Bearer ${token}` } });
            response.data.courses.forEach(course => {
                if (!(course.course.id in ed_storage.courses)) {
                    ed_storage.courses[course.course.id] = {
                        lastTimestamp: Date.parse("1970-01-01T00:00:00Z"),
                        name: `${course.code}: ${course.name}`
                    };
                    ed_storage.announcementBindings[course.course.id] = [];
                    ed_storage.threadBindings[course.course.id] = [];
                    console.log(`indexed course ${course.course.id}: ${course.course.code}: ${course.course.name}`);
                }
            });
            tokens.push(token);
        } catch (error) {
            throw new Error(error);
        }
    }
}

/*
Gets a list of courses
*/

export function GetCourses() {
    return Object.keys(ed_storage.courses);
}

/*
Checks if a course is known
*/
export function CourseExists(courseId) {
    return courseId in course_tokens;
}

/*
Gets course info
*/
export function GetCourseInfo(courseId) {
    return ed_storage.courses[courseId];
}

/*
to actually access messages in a course, we can GET from https://edstem.org/api/courses/<course_id>/threads?limit=30&sort=new
this returns the most recent 30 messages, with pinned messages at the top.
*/
/* example response:
sort_key: ""; // ???
threads: <an array with 30 objects. an example>
{id: 2071513, user: <see below>, course_id: 15940, title: "title", type: "question" OR "post" content: <HTML>, document: <not HTML>, is_seen: <bool>, number: <int>, created_at: 2024-06-21T08:02:53.558047+10:00}
note that anonymous users will result in user being null.
id is post id and is unique
users: <an array containing user objects. examples>
{id: 248767, role: "user", name: "Lecturer", avatar: "<avatarId>", course_role: "admin", role: "user"}
{id: 411908, role: "user", name: "Student", avatar: null, course_role: "student", tutorials: {}}
For Lecturer's avatar, goto https://static.au.edusercontent.com/avatars/<avatarId>?s=128&fallback=1
*/

// Reads course if it has been indexed.
export async function ReadCourse(courseId) {
    if (!(courseId in course_tokens)) {
        throw new Error("Course token not found. Please add it to ed-tokens.");
    }
    if (!(courseId in ed_storage.courses)) {
        throw new Error("Course not indexed yet. Please run ReadUser first.")
    }
    try {
        const response = await axios.get(`/courses/${courseId}/threads?limit=30&sort=new`, { headers: { 'Authorization': `Bearer ${course_tokens[courseId]}` } });
        const newThreads = [];
        response.data.threads.forEach(thread => {
            if (Date.parse(thread.created_at) > ed_storage.courses[courseId].lastTimestamp) {
                newThreads.push(thread);
            }
        });
        ed_storage.courses[courseId].lastTimestamp = Date.now();
        saveStorageToDisk();
        return newThreads;
    } catch (error) {
        throw new Error(error);
    }
}

/*
Adds course binding to a certain Discord channel.
*/

export function BindCourse(courseId, channelId, type) {
    if (!CourseExists(courseId)) {
        throw new Error(`Course ${courseId} does not exist.`);
    }
    switch(type) {
        case 'announcements':
            if (channelId in ed_storage.announcementBindings[courseId]) {
                throw new Error(`Course ${courseId} is already bound to channel ${channelId} for announcements.`);
            }
            ed_storage.announcementBindings[courseId].push(channelId);
            break;
        case 'normal':
            if (channelId in ed_storage.threadBindings[courseId]) {
                throw new Error(`Channel ${courseId} is already bound to channel ${channelId} for threads.`);
            }
            ed_storage.threadBindings[courseId].push(channelId);
            break;
    }
    saveStorageToDisk();
}

/*
Removes course bindings
*/

export function UnbindCourse(courseId, channelId) {
    if (!CourseExists(courseId)) {
        throw new Error(`Course ${courseId} does not exist.`);
    }
    if (channelId in ed_storage.announcementBindings[courseId]) {
        ed_storage.announcementBindings[courseId].splice(ed_storage.announcementBindings[courseId].indexOf(channelId), 1);
    }
    if (channelId in ed_storage.threadBindings[courseId]) {
        ed_storage.threadBindings[courseId].splice(ed_storage.threadBindings[courseId].indexOf(channelId), 1);
    }
    saveStorageToDisk();
}

/*
Get current course bindings
*/

export function GetCourseBindings(courseId, type) {
    const channelIds = [];
    switch (type) {
        case 'announcements':
            for (const channelId in ed_storage.announcementBindings[courseId]) {
                channelIds.push(channelId);
            }
            break;
        case 'normal':
            for (const channelId in ed_storage.threadBindings[courseId]) {
                channelIds.push(channelId);
            }
            break;
        default:
            for (const channelId in ed_storage.announcementBindings[courseId]) {
                channelIds.push(channelId);
            }
            for (const channelId in ed_storage.threadBindings[courseId]) {
                channelIds.push(channelId);
            }
            break;
    }
    return channelIds;
}

/*
Saves to disk
*/

function saveStorageToDisk() {
    try {
        fs.writeSync(path.join(__dirname, 'ed-storage.json'), JSON.stringify(ed_storage));
    } catch (error) {
        console.error(error);
    }
}

/*
you can also access specific threads by GET from https://edstem.org/api/threads/<id>?view=1 which will return a similar response to above,
albeit the property is called thread rather than threads
*/

export async function GetThread(courseId, threadId) {
    try {
        const response = await axios.get(`/threads/${threadId}?view=1`, { headers: { 'Authorization': `Bearer ${course_tokens[courseId]}` } });
        if (response.data.thread.user_id !== 0) {
            response.data.thread.user = response.data.users[0];
        }
        return response.data.thread;
    } catch (error) {
        throw new Error(error);
    }
}

export function init() {
    // Get storage file to get latest post IDs. If not found, then create an object to store it in.
    try {
        ed_storage = fs.readFileSync(path.join(__dirname, 'ed-storage.json'), 'utf-8');
    } catch (error) {
        ed_storage = {
            courses: {},
            announcementBindings: {},
            threadBindings: {},
        };
    }
    ReadUser();
    // initially, client POSTs to https://edstem.org/api/renew_token with token in X-Token header (this is used in
    // all requests, returning a JSON obj with a token property containing either the old token or a new token
    // Renews token when constructed (not really used anymore w/ API keys)
}