import createError from 'http-errors';
import express, {NextFunction, Request, Response} from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import livereload from 'livereload';
import connectLivereload from 'connect-livereload';
import session from 'express-session';
import connect_session_sequelize from 'connect-session-sequelize';

import debugFactory from 'debug';
import {IsAuthenticated} from './middlewares/is-authenticated';
import {indexRouter as indexRouter} from './routes/index-router';
import {authRouter as authRouter} from './routes/auth-router';
import {booksRouter as booksRouter} from './routes/books-router';
import {jobsRouter as jobsRouter} from './routes/jobs-router';
import {seriesRouter as seriesRouter} from './routes/series-router';
import {SequelizeController} from './controllers/sequelize-controller';
import {User} from './models';
import moment from 'moment';

const SequelizeStore = connect_session_sequelize(session.Store);
const debug = debugFactory('warene:app');

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
app.use(cookieParser(process.env.COOKIE_SECRET || "thisismysecrctekeyfhrgfgrfrty84fwir767"));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended: true}));

const ninetyDay = 90 * 24 * 60 * 60 * 1000;
app.use(session({
    store: new SequelizeStore({
        db: SequelizeController,
    }),
    secret: process.env.SESSION_SECRET || "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized: true,
    cookie: {maxAge: ninetyDay},
    resave: false
}));

if (process.env.LIVERELOAD === "true") {
    debug('starting Livereload', __dirname)
    const livereloadServer = livereload.createServer();
    livereloadServer.watch(path.join(__dirname));
    livereloadServer.server.once("connection", () => {
        setTimeout(() => {
            livereloadServer.refresh(".");
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
app.use('/jobs', IsAuthenticated, jobsRouter);
app.use('/series', IsAuthenticated, seriesRouter);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err:any , req: Request, res:Response, next: NextFunction) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});
