import "reflect-metadata"
import { DataSource } from "typeorm"
import {
    Author,
    Book,
    BookEdition,
    Category,
    Collection,
    Config,
    Job,
    Publisher,
    Series, Session, Type, User
} from '../models';

export const AppDataSource = new DataSource({
    type: <any>process.env.DATABASE_DIALECT || 'postgres',
    host: process.env.DATABASE_PATH || 'localhost',
    port: <any>process.env.DATABASE_PORT || 5432,
    username: <any>process.env.DATABASE_USERNAME ||"root",
    password: <any>process.env.DATABASE_PASSWORD ||"admin",
    database: <any>process.env.DATABASE_NAME ||"test",
    entities: [Author, Book, BookEdition, Category, Collection, Config, Job, Publisher, Series, Type, User, Session],
    synchronize: <any>process.env.DATABASE_SYNCHRONIZE ||true,
    logging: <any>process.env.DATABASE_LOGGING || false,
})


