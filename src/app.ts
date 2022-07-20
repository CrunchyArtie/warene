import * as dotenv from 'dotenv';
dotenv.config();
import createError from 'http-errors';
import express, {NextFunction, Request, Response} from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import livereload from 'livereload';
import connectLivereload from 'connect-livereload';
import session from 'express-session';
import DebugFactory from './utils/debug-factory';
import {IsAuthenticated} from './middlewares';
import {
    indexRouter,
    authRouter,
    booksRouter,
    seriesRouter,
    configRouter,
    apiSeriesRouter
} from './routers';
import {User} from './models';
import moment from 'moment';
import {TypeormStore} from 'connect-typeorm';
import {AppDataSource} from './utils/app-data-source';
import {Session} from './models/database-models/session';

const debug = new DebugFactory('warene:app');
const sessionRepository = AppDataSource.getRepository(Session);
declare module 'express-session' {
    export interface SessionData {
        user: User;
        isAuthenticated: boolean;
    }
}

moment.locale('fr');

export const app = express();

// view engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'pug');

// app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser(process.env.COOKIE_SECRET || 'thisismysecrctekeyfhrgfgrfrty84fwir767'));
app.use(express.static(path.join(__dirname, '../public')));
app.use(bodyParser.urlencoded({extended: true}));

const ninetyDay = 90 * 24 * 60 * 60 * 1000;


app.use(session({
    store: new TypeormStore({
        cleanupLimit: 2,
        limitSubquery: false, // If using MariaDB.
        ttl: 86400
    }).connect(sessionRepository),
    secret: process.env.SESSION_SECRET || 'thisismysecrctekeyfhrgfgrfrty84fwir767',
    saveUninitialized: true,
    cookie: {maxAge: ninetyDay},
    resave: false
}));

if (process.env.LIVERELOAD === 'true') {
    debug.debug('starting Livereload', __dirname)
    const livereloadServer = livereload.createServer();
    livereloadServer.watch(path.join(__dirname));
    livereloadServer.server.once('connection', () => {
        setTimeout(() => {
            livereloadServer.refresh('.');
        }, 500);
    });
    app.use(connectLivereload());
}

app.use((req, res, next) => {
    if (req.session.user) {
        res.locals.isAuthenticated = true;
        res.locals.username = req.session?.user?.username || '';
    } else {
        res.locals.isAuthenticated = false;
        res.locals.username = null;
    }

    next();
})

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/books', IsAuthenticated, booksRouter);
app.use('/series', IsAuthenticated, seriesRouter);
app.use('/config', IsAuthenticated, configRouter);
app.use('/api/series', apiSeriesRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err: any, req: Request, res: Response, next: NextFunction) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});
