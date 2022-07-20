#!/usr/bin/env node
import * as dotenv from 'dotenv';

dotenv.config();

import {app} from '../app';
import DebugFactory from '../utils/debug-factory';
import http from 'http';
import ErrnoException = NodeJS.ErrnoException;
import {Server} from 'socket.io';
import IoController from '../controllers/io-controller';
import {AppDataSource} from '../utils/app-data-source';

/**
 * Module dependencies.
 */
const debug = new DebugFactory('warene:server');

// to initialize initial connection with the database, register all entities
// and "synchronize" database schema, call "initialize()" method of a newly created database
// once in your application bootstrap
AppDataSource.initialize()
    .then(() => {
        // here you can start to work with your database

        /**
         * Get port from environment and store in Express.
         */
        const port = normalizePort(process.env.PORT || '3000');
        app.set('port', port);

        /**
         * Create HTTP server.
         */
        const serve = http.createServer(app);

        const io = new Server(serve);
        IoController.register(io);

        /**
         * Listen on provided port, on all network interfaces.
         */

        serve.listen(port);
        serve.on('error', onError);
        serve.on('listening', onListening);

        /**
         * Normalize a port into a number, string, or false.
         */

        function normalizePort(val: string) {
            const port = parseInt(val, 10);

            if (isNaN(port)) {
                // named pipe
                return val;
            }

            if (port >= 0) {
                // port number
                return port;
            }

            return false;
        }

        /**
         * Event listener for HTTP server "error" event.
         */

        function onError(error: ErrnoException) {
            if (error?.syscall !== 'listen') {
                throw error;
            }

            const bind = typeof port === 'string'
                ? 'Pipe ' + port
                : 'Port ' + port;

            // handle specific listen errors with friendly messages
            switch (error.code) {
                case 'EACCES':
                    console.error(bind + ' requires elevated privileges');
                    process.exit(1);
                    break;
                case 'EADDRINUSE':
                    console.error(bind + ' is already in use');
                    process.exit(1);
                    break;
                default:
                    throw error;
            }
        }

        /**
         * Event listener for HTTP server "listening" event.
         */

        function onListening() {
            const address = serve.address();
            let bind;
            if (typeof address === 'string') {
                bind = 'pipe ' + address;
                debug.info('Listening on ' + bind);
                debug.info('address', address)

            } else {
                bind = 'port ' + address?.port;
                debug.info('Listening on ' + bind);
                debug.info('http://localhost:' + process.env.PORT)
            }
        }

    })
    .catch((error) => console.log(error))
