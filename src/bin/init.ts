import * as dotenv from 'dotenv';
dotenv.config();

import session from 'express-session';
import connect_session_sequelize from 'connect-session-sequelize';
import DebugFactory from '../utils/debug-factory';
import {AuthenticationController} from '../controllers';
import {
    Job,
    User,
    Author,
    Book,
    BookAuthor,
    BookUser,
    Category,
    Collection,
    Publisher,
    Series,
    Type,
    BookEdition
} from '../models';
import Sequelize from '../utils/sequelize';
import {Config} from '../models';
const debug = new DebugFactory('warene:init');

const SequelizeStore = connect_session_sequelize(session.Store);

new SequelizeStore({
    db: Sequelize
}).sync()

debug.info( 'Session ok');

Promise.all([
    User.sync().then(() => debug.info( 'User created')),
    Author.sync().then(() => debug.info( 'Author created')),
    Book.sync().then(() => debug.info( 'Book created')),
    BookEdition.sync().then(() => debug.info( 'BookEdition created')),
    BookAuthor.sync().then(() => debug.info( 'BookAuthor created')),
    BookUser.sync().then(() => debug.info( 'BookUser created')),
    Category.sync().then(() => debug.info( 'Category created')),
    Collection.sync().then(() => debug.info( 'Collection created')),
    Publisher.sync().then(() => debug.info( 'Publisher created')),
    Series.sync().then(() => debug.info( 'Series created')),
    Type.sync().then(() => debug.info( 'Type created')),
    Job.sync().then(() => debug.info( 'Job created')),
    Config.sync().then(() => debug.info( 'Config created'))
]).then(async () => {

    await User.findOrCreate({
        where: {
            username: process.env.ADMIN_LOGIN || 'admin'
        }, defaults: {
            username: process.env.ADMIN_LOGIN || 'admin',
            password: AuthenticationController.hashPassword(process.env.ADMIN_PASSWORD || 'root')
        }
    })
    debug.info( 'Admin created');

    await Config.findOrCreate({
        where: {
            name: 'worker-is-running'
        }, defaults: {
            name: 'worker-is-running',
            value: 'true'
        }
    })
    debug.info( 'Config filled');
})
