import { Sequelize } from 'sequelize-typescript'
import {Config, Job, Author, Book, BookAuthor, BookUser, Category, Collection, Publisher, Series, Type, User} from '../models';

const sequelizeInstance = new Sequelize({
    database: process.env.DATABASE_NAME || 'warene',
    dialect: 'sqlite',
    username: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    storage: process.env.DATABASE_PATH || ':memory:',
    logging: (process.env.DATABASE_LOGGING === "true") || false,
    models: [
        Author,
        Book,
        BookAuthor,
        BookUser,
        Category,
        Collection,
        Publisher,
        Series,
        Type,
        User,
        Job,
        Config,
    ]
})

export default sequelizeInstance
