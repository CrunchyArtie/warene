import * as dotenv from 'dotenv';

dotenv.config();
import DebugFactory from '../utils/debug-factory';
import {WorkerController} from '../controllers';

const debug = new DebugFactory('warene:worker');

debug.trace( 'start');
WorkerController.work()
    .catch((err) => {
        console.error(err);
    })
