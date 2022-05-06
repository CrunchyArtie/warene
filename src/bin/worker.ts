import * as dotenv from 'dotenv';

dotenv.config();
import debugFactory from 'debug';
import {WorkerController} from '../controllers';

const debug = debugFactory('warene:worker');

debug('trace', 'start');
WorkerController.work()
    .catch((err) => {
        console.error(err);
    })
