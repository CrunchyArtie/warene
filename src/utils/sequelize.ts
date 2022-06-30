import { Sequelize } from 'sequelize-typescript'
import {
    Config,
    Job,
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
    BookEdition
} from '../models';

const sequelizeInstance = new Sequelize({
    database: process.env.DATABASE_NAME || 'warene',
    dialect: <any> process.env.DATABASE_DIALECT || 'sqlite',
    username: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    port: +<any>process.env.DATABASE_PORT || 5432,
    storage: process.env.DATABASE_PATH || ':memory:',
    host: process.env.DATABASE_PATH || 'localhost',
    logging: (process.env.DATABASE_LOGGING === "true") || false,
    models: [
        Author,
        Book,
        BookEdition,
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
