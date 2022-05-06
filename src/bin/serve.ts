#!/usr/bin/env node
import * as dotenv from 'dotenv';
dotenv.config();

import {app} from "../app";
import debugFactory from "debug";
import http from "http";
import ErrnoException = NodeJS.ErrnoException;

/**
 * Module dependencies.
 */
const debug = debugFactory('warene:server');

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */
const serve = http.createServer(app);

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
    debug('Listening on ' + bind);
    debug('address', address)

  } else {
    bind = 'port ' + address?.port;
    debug('Listening on ' + bind);
    debug('http://localhost:' + process.env.PORT)
  }
}
