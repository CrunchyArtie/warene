import * as dotenv from 'dotenv';

dotenv.config();
import DebugFactory from '../utils/debug-factory';
import {WorkerController} from '../controllers';
import {AppDataSource} from '../utils/app-data-source';

const debug = new DebugFactory('warene:worker');

debug.trace( 'start');

// to initialize initial connection with the database, register all entities
// and "synchronize" database schema, call "initialize()" method of a newly created database
// once in your application bootstrap
AppDataSource.initialize()
    .then(() => {
        WorkerController.work()
            .catch((err) => {
                console.error(err);
            })

    })
    .catch((error) => console.log(error))

