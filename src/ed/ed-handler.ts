import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { CONFIG } from '../index.js';

type ThreadType = 'question' | 'post' | 'announcement' | string;

interface ThreadUser {
    id: number;
    name: string;
    avatar: string | null;
    course_role: string;
    role: string;
}

export interface Thread {
    id: number;
    user_id: number;
    user: ThreadUser | null;
    course_id: number;
    title: string;
    type: ThreadType;
    document: string;
    created_at: string;
    number: number;
    is_private?: boolean;
    is_anonymous?: boolean;
    anonymous_id?: number;
}

interface CourseInfo {
    lastTimestamp: number;
    name: string;
}

interface UserCourseResponse {
    courses: Array<{
        course: { id: number; code: string; name: string };
    }>;
}

interface ThreadsResponse {
    threads: Thread[];
}

interface ThreadResponse {
    thread: Thread;
    users: ThreadUser[];
}

interface EdStorage {
    courses: Record<string, CourseInfo>;
    announcementBindings: Record<string, string[]>;
    threadBindings: Record<string, string[]>;
}

axios.defaults.baseURL = 'https://edstem.org/api/';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(process.cwd());

function resolveFirstExisting(candidates: Array<string | undefined>): string | undefined {
    for (const candidate of candidates) {
        if (candidate && fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return undefined;
}

function resolveStoragePath(): string {
    const preferred = process.env.ED_STORAGE_PATH ? path.resolve(process.env.ED_STORAGE_PATH) : undefined;
    const existing = resolveFirstExisting([
        preferred,
        path.join(projectRoot, 'data/ed-storage.json'),
        path.join(projectRoot, 'src/ed/ed-storage.json'),
        path.join(__dirname, 'ed-storage.json'),
    ]);
    if (preferred) {
        return preferred;
    }
    return existing ?? path.join(projectRoot, 'data/ed-storage.json');
}

function getTokens(): string[] {
    if (CONFIG["EdDiscussion"].tokens) {
        const tokens = CONFIG["EdDiscussion"].tokens;
        if (!Array.isArray(tokens)) {
            throw new Error("ED_TOKENS must be an array.");
        }
        return tokens;
    }
    throw new Error("Unable to load course tokens. Please set the ED_TOKENS environment variable.");
}

const courseTokens: Map<string, string> = new Map();
const storagePath = resolveStoragePath();

let edStorage: EdStorage = {
    courses: {},
    announcementBindings: {},
    threadBindings: {},
};

// ED_COURSES: comma-separated list of numerical course IDs to whitelist.
// If missing or empty, the whitelist is empty and no courses are allowed.
function parseCourseWhitelist(): Set<string> {
    const raw = process.env.ED_COURSES ?? '';
    const parts = raw.split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0 && /^\d+$/.test(p));
    return new Set(parts);
}

const courseWhitelist: Set<string> = parseCourseWhitelist();

export function IsCourseWhitelisted(courseId: number | string): boolean {
    return courseWhitelist.has(courseId.toString());
}

function loadStorageFromDisk(): void {
    try {
        const stored = fs.readFileSync(storagePath, 'utf-8');
        edStorage = JSON.parse(stored) as EdStorage;
    } catch (error) {
        // If the storage file doesn't exist yet, fall back to the default object.
        edStorage = {
            courses: {},
            announcementBindings: {},
            threadBindings: {},
        };
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.error(`[${(new Date()).toLocaleString()}] Failed to read storage file:`, error);
        }
    }
}

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
                "id": 12345,
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

export async function ReadUser(): Promise<void> {
    const tokens: string[] = getTokens();
    for (const token of tokens) {
        try {
            const response = await axios.get<UserCourseResponse>('/user', { headers: { Authorization: `Bearer ${token}` } });
            response.data.courses.forEach(course => {
                // if not in whitelist, skip loading course
                if (!courseWhitelist.has(course.course.id.toString())) {
                    return;
                }

                if (!(course.course.id in edStorage.courses)) {
                    edStorage.courses[course.course.id] = {
                        lastTimestamp: Date.parse('1970-01-01T00:00:00Z'),
                        name: `${course.course.code}: ${course.course.name}`,
                    };
                    edStorage.announcementBindings[course.course.id] = [];
                    edStorage.threadBindings[course.course.id] = [];
                    console.log(`Indexed course ${course.course.id}: ${course.course.code}: ${course.course.name}`);
                }
                courseTokens.set(course.course.id.toString(), token);
            });
        } catch (error) {
            throw new Error(String(error));
        }
    }
}

/*
    Gets a list of course IDs
*/

export function GetCourseIds(): string[] {
    return Array.from(courseWhitelist);
}


/*
    Checks if a course exists
*/

export function CourseExists(courseId: number | string): boolean {
    return courseId.toString() in edStorage.courses;
}

/*
    Checks if a course has a token
*/
export function CourseHasToken(courseId: number | string): boolean {
    return courseTokens.has(courseId.toString());
}

/*
    Gets course info
*/
export function GetCourseInfo(courseId: number | string): CourseInfo | undefined {
    return edStorage.courses[courseId.toString()];
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
export async function ReadCourse(courseId: number | string): Promise<Thread[]> {
    if (!CourseHasToken(courseId)) {
        throw new Error(`Course token for ${courseId} not found. Please add it to ed-tokens.`);
    }
    if (!CourseExists(courseId)) {
        throw new Error(`Course ${courseId} not indexed yet. Please run ReadUser first.`);
    }
    courseId = courseId.toString();
    const token = courseTokens.get(courseId);
    try {
        const response = await axios.get<ThreadsResponse>(`/courses/${courseId}/threads?limit=30&sort=new`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const newThreads: Thread[] = [];
        for (const thread of response.data.threads) {
            const createdAt = Date.parse(thread.created_at);
            if (createdAt > edStorage.courses[courseId].lastTimestamp) {
                console.log(`[${(new Date()).toLocaleString()}] New thread ${thread.id} discovered in course ${courseId}.`);
                if (thread.is_private) {
                    console.log('Thread private, not included for dispatch...');
                } else {
                    newThreads.push(thread);
                }
            }
        }
        newThreads.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
        edStorage.courses[courseId.toString()].lastTimestamp = Date.now();
        saveStorageToDisk();
        return newThreads;
    } catch (error) {
        throw new Error(String(error));
    }
}

/*
Adds course binding to a certain Discord channel.
*/

export function BindCourse(courseId: number | string, channelId: string, type: 'announcements' | 'normal'): void {
    if (!CourseHasToken(courseId)) {
        throw new Error(`Course ${courseId} does not exist.`);
    }
    const key = courseId.toString();
    if (!edStorage.announcementBindings[key]) {
        edStorage.announcementBindings[key] = [];
    }
    if (!edStorage.threadBindings[key]) {
        edStorage.threadBindings[key] = [];
    }
    switch (type) {
        case 'announcements':
            if (edStorage.announcementBindings[key].includes(channelId)) {
                throw new Error(`Course ${courseId} is already bound to channel ${channelId} for announcements.`);
            }
            edStorage.announcementBindings[key].push(channelId);
            break;
        case 'normal':
            if (edStorage.threadBindings[key].includes(channelId)) {
                throw new Error(`Course ${courseId} is already bound to channel ${channelId} for threads.`);
            }
            edStorage.threadBindings[key].push(channelId);
            break;
    }
    saveStorageToDisk();
}

/*
Removes course bindings
*/

export function UnbindCourse(courseId: number | string, channelId: string): void {
    if (!CourseHasToken(courseId)) {
        throw new Error(`Course ${courseId} does not exist.`);
    }
    const key = courseId.toString();
    if (!edStorage.announcementBindings[key]) {
        edStorage.announcementBindings[key] = [];
    }
    if (!edStorage.threadBindings[key]) {
        edStorage.threadBindings[key] = [];
    }
    if (edStorage.announcementBindings[key].includes(channelId)) {
        edStorage.announcementBindings[key].splice(edStorage.announcementBindings[key].indexOf(channelId), 1);
    }
    if (edStorage.threadBindings[key].includes(channelId)) {
        edStorage.threadBindings[key].splice(edStorage.threadBindings[key].indexOf(channelId), 1);
    }
    saveStorageToDisk();
}

/*
Get current course bindings
*/

export function GetCourseBindings(courseId: number | string, type?: 'announcements' | 'normal'): string[] {
    const key = courseId.toString();
    const channelIds: string[] = [];
    if (!edStorage.announcementBindings[key]) {
        edStorage.announcementBindings[key] = [];
    }
    if (!edStorage.threadBindings[key]) {
        edStorage.threadBindings[key] = [];
    }
    switch (type) {
        case 'announcements':
            channelIds.push(...edStorage.announcementBindings[key]);
            break;
        case 'normal':
            channelIds.push(...edStorage.threadBindings[key]);
            break;
        default:
            channelIds.push(...edStorage.announcementBindings[key]);
            channelIds.push(...edStorage.threadBindings[key]);
            break;
    }
    return channelIds;
}

/*
Saves to disk
*/

function saveStorageToDisk(): void {
    try {
        fs.mkdirSync(path.dirname(storagePath), { recursive: true });
        fs.writeFileSync(storagePath, JSON.stringify(edStorage));
        console.log(`[${(new Date()).toLocaleString()}] Saved to storage!`);
    } catch (error) {
        console.error(`[${(new Date()).toLocaleString()}] Failed to save storage:`, error);
    }
}

/*
you can also access specific threads by GET from https://edstem.org/api/threads/<id>?view=1 which will return a similar response to above,
albeit the property is called thread rather than threads
*/

export async function GetThread(courseId: number | string, threadId: number | string): Promise<Thread> {
    if (!IsCourseWhitelisted(courseId)) {
        throw new Error(`Course ${courseId} is not whitelisted.`);
    }
    const token = courseTokens.get(courseId.toString());
    if (!token) {
        throw new Error(`Course token for ${courseId} not found. Please add it to ed-tokens.`);
    }
    try {
        const response = await axios.get<ThreadResponse>(`/threads/${threadId}?view=1`, { headers: { Authorization: `Bearer ${token}` } });
        if (response.data.thread.user_id !== 0) {
            const userMap = new Map<number, ThreadUser>();
            for (const user of response.data.users) {
                userMap.set(user.id, user);
            }
            response.data.thread.user = userMap.get(response.data.thread.user_id) ?? response.data.users[0] ?? null;
        }
        return response.data.thread;
    } catch (error) {
        throw new Error(String(error));
    }
}

export function init(): void {
    loadStorageFromDisk();
    void ReadUser().catch(error => console.error(`[${(new Date()).toLocaleString()}] Failed to read user data:`, error));
    // initially, client POSTs to https://edstem.org/api/renew_token with token in X-Token header (this is used in
    // all requests, returning a JSON obj with a token property containing either the old token or a new token
    // Renews token when constructed (not really used anymore w/ API keys)
}