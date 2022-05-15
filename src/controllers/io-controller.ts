import {Server} from 'socket.io';
import {io, Socket} from 'socket.io-client';
import debugFactory from 'debug';

const debug = debugFactory('warene:IoController');
class IoController {
    private static instance: IoController;

    static getInstance () {
        if (!IoController.instance) {
            IoController.instance = new IoController();
        }

        return IoController.instance;
    }

    private workerSocket: Socket;

    protected constructor() {
        this.workerSocket = io((process.env.BASE_URL || 'http://localhost') +':'+ (process.env.WORKER_SOCKET_PORT || 3001));
    }

    public register(io: Server) {
        io.on("connection", clientSocket => {
            // send a message to the client
            debug('debug', 'to client: ping ?');
            clientSocket.emit("ping");

            // receive a message from the client
            clientSocket.on("pong", (...args) => {
                debug('debug', "from client: pong", args);
            });

            if(this.workerSocket){
                this.workerSocket.on('ping', (...args) => {
                    debug('debug', 'from worker: ping')
                    this.workerSocket.emit('pong');
                })

                this.workerSocket.on('job-done', args => {
                    clientSocket.emit('job-done', args)
                })
            }
        });
    }
}

export default IoController.getInstance();
