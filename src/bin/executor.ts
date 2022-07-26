import * as dotenv from 'dotenv';

dotenv.config();

import DebugFactory from '../utils/debug-factory';
import {BrowserController} from '../controllers';
import {AppDataSource} from '../utils/app-data-source';

const debug = new DebugFactory('warene:executor');

debug.info('EXECUTOR !');

// to initialize initial connection with the database, register all entities
// and "synchronize" database schema, call "initialize()" method of a newly created database
// once in your application bootstrap
AppDataSource.initialize()
    .then(() => {
        // here you can start to work with your database


        BrowserController.getBookOwnedEditionUrl('/planetes-tome-1/album/ccAgKV1LRE/q83by91xEqBHcY', ['9782809450798']).then((result) => {
            debug.info(result);
        }).catch((err) => {
            console.error(err);
        })
    })
    .catch((error) => console.log(error))
