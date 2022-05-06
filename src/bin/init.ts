import * as dotenv from 'dotenv';
dotenv.config();

import session from 'express-session';
import connect_session_sequelize from 'connect-session-sequelize';
import debugFactory from 'debug';
import {AuthenticationController, SequelizeController} from '../controllers';
import {Job, User, Author, Book, BookAuthor, BookUser, Category, Collection, Publisher, Series, Type} from '../models';
const debug = debugFactory('warene:init');

const SequelizeStore = connect_session_sequelize(session.Store);

new SequelizeStore({
    db: SequelizeController
}).sync()

debug('info', 'Session ok');

Promise.all([
    User.sync().then(() => debug('info', 'User created')),
    Author.sync().then(() => debug('info', 'Author created')),
    Book.sync().then(() => debug('info', 'Book created')),
    BookAuthor.sync().then(() => debug('info', 'BookAuthor created')),
    BookUser.sync().then(() => debug('info', 'BookUser created')),
    Category.sync().then(() => debug('info', 'Category created')),
    Collection.sync().then(() => debug('info', 'Collection created')),
    Publisher.sync().then(() => debug('info', 'Publisher created')),
    Series.sync().then(() => debug('info', 'Series created')),
    Type.sync().then(() => debug('info', 'Type created')),
    Job.sync().then(() => debug('info', 'Job created'))
]).then(async () => {

    await User.findOrCreate({
        where: {
            username: process.env.ADMIN_LOGIN || 'admin'
        }, defaults: {
            username: process.env.ADMIN_LOGIN || 'admin',
            password: AuthenticationController.hashPassword(process.env.ADMIN_PASSWORD || 'root')
        }
    })
    debug('info', 'Admin created');
})