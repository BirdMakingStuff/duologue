// requiring required packages
import * as fs from 'fs';
import * as path from 'path';
import axios from axios;
import 'dotenv/config';
import { error } from 'console';

// reading token from .env file

const token = process.env.ED_TOKEN;
const course_tokens = require("./ed-tokens.json");
axios.defaults.baseURL = 'https://edstem.org/api/';
let ed_axios = axios.create({
    baseURL: 'https://edstem.org/api/',
    timeout: 1000,
    headers: { Authorisation: `Bearer ${token}` },
});

// Get storage file to get latest post IDs. If not found, then create an object to store it in.
let storage;
try {
    storage = fs.readFileSync('./ed-storage.json');
} catch (error) {
    console.error(error);
    storage = {
        courses: {}
    };
}

// NOTE: websockets on ed do not work with api keys :(
// a web socket is opened to listen for new unreads (wss://notes.au.edstem.org/api/browser/websock?access_token=<X-Token>)
/* example response:
data: {last_open: "2024-06-11T15:27:49.014152+10:00", unread: 0},
type: "init",
*/
/*
function bindUpdates() {
    const ws = new WebSocket(`wss://notes.au.edstem.org/api/browser/websock?access_token=${token}`);
    ws.addEventListener("open", function(event) {
        console.log("Websocket established");
    })
    ws.addEventListener("message", function(event) {
        const data = JSON.parse(event.data);
        if (data.type === "init") {
            // Begin reading courses

        }
    })
}
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

export function ReadUser() {
    axios.get('/user',  { headers: { Authorisation: `Bearer ${token}` } })
        .then(response => {
            response.data.courses.foreach(course => {
                if (!storage.courses[course.id]) {
                    storage.courses[course.id] = {
                        lastTimestamp: Date.parse("1970-01-01T00:00:00Z"),
                        name: `${course.code}: ${course.name}`
                    };
                }
            })
        })
        .catch(error => {
            throw new Error(error);
        });
}

export function GetCourseInfo(courseId) {
    return storage.courses[courseId];
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
export function ReadCourse(courseId) {
    if (!storage.courses[courseId]) {
        console.error("Course not indexed yet. Please run ReadUser first.");
        return;
    }
    axios.get(`/courses/${courseId}/threads?limit=30&sort=new`, { headers: { Authorisation: `Bearer ${token}` } })
        .then(response => {
            const newThreads = [];
            response.data.threads.forEach(thread => {
                if (Date.parse(thread.created_at) > storage.courses[courseId].lastTimestamp) {
                    newThreads.push(thread);
                }
            });
            storage.courses[courseId].lastTimestamp = Date.now();
            return newThreads;
        }).catch(error => {
            console.error(error);
        });
}

/*
you can also access specific threads by GET from https://edstem.org/api/threads/<id>?view=1 which will return a similar response to above,
albeit the property is called thread rather than threads
*/

export default function init() {
    // initially, client POSTs to https://edstem.org/api/renew_token with token in X-Token header (this is used in
    // all requests, returning a JSON obj with a token property containing either the old token or a new token
    // Renews token when constructed (not really used anymore w/ API keys)
    /*
    ed_axios.post('/renew_token')
        .then(response => {
            const new_token = response.data.token;
            // Token has changed, get a new one and save
            if (new_token !== token) {
                console.log("A new token has been obtained. Editing axios and saving...")
                token = new_token;
                ed_axios = axios.create({
                    baseURL: 'https://edstem.org/api/',
                    timeout: 1000,
                    headers: { Authorisation: `Bearer ${token}` },
                });
                fs.writeFileSync('./ed-config.json', JSON.stringify(token), function (error) {
                    if (error) {
                        console.log(error);
                    };
                });
            } else {
                console.log("Token has not changed. Continuing to use old token.");
            }
        })
        .catch(error => {
            console.error(error);
            return;
        });
    */
}