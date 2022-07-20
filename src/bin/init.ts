import * as dotenv from 'dotenv';

dotenv.config();

import DebugFactory from '../utils/debug-factory';
import {AuthenticationController} from '../controllers';
import {
    Job,
    User,
    Author,
    Book,
    Category,
    Collection,
    Publisher,
    Series,
    Type,
    BookEdition
} from '../models';
import {AppDataSource} from '../utils/app-data-source';
import {Config} from '../models';

const debug = new DebugFactory('warene:init');

// to initialize initial connection with the database, register all entities
// and "synchronize" database schema, call "initialize()" method of a newly created database
// once in your application bootstrap
AppDataSource.initialize()
    .then(async () => {
        const user = await AppDataSource.getRepository(User).findOneBy({username: process.env.ADMIN_LOGIN || 'admin'})
        if (!user) {
            await AppDataSource.getRepository(User).save({
                username: process.env.ADMIN_LOGIN || 'admin',
                password: AuthenticationController.hashPassword(process.env.ADMIN_PASSWORD || 'root')
            })
            debug.info('Admin created');
        };

        const key = await AppDataSource.getRepository(Config).findOneBy({name: 'worker-is-running'})
        if (!key) {
            await AppDataSource.getRepository(Config).save({
                name: 'worker-is-running',
                value: 'true'
            })
            debug.info('Config filled');
        };

    })
    .catch((error) => console.log(error))
