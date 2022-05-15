import {job} from "./job.js";
import {toast} from "./toast.js";

const socket = io("ws://localhost:3000");

// send a message to the server

// receive a message from the server
// socket.on("ping", (...args) => {
//     console.log('ping')
//     socket.emit("pong");
// });

socket.on("job-done", (...args) => {
    // console.log('job-done', args)
    job.notify("job-done", ...args);
});

job.register('job-done', (element, job) => {
    if(job.type === 'refreshBook') {
        // console.log(element, job);
        toast.hey('Job fini !', '<div>Des données sont obsolètes, va falloir recharger</div><button class="btn btn-primary mx-auto" OnClick="location.reload()">Recharger</button>')
    }
})

