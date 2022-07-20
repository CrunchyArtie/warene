import express from 'express';
import {AuthenticationController, BookController, BrowserController, WorkerController} from '../controllers';
import DebugFactory from '../utils/debug-factory';
import {Job} from '../models';
import {AppDataSource} from '../utils/app-data-source';

const debug = new DebugFactory('warene:bookRouter');

export const booksRouter = express.Router();

booksRouter.get('/', async function (req, res, next) {
    debug.trace('get', '/')
    res.redirect('/books/own');
});

booksRouter.get('/all', async function (req, res, next) {
    debug.trace('get', '/')
    const books = await BookController.getBooks(/*[{model: BookEdition, include: [Book]}, Author, Category, Author, Collection, Type]*/);
    res.render('books/all', {title: 'Tout le contenu du site', books});
});

booksRouter.get('/own', async function (req, res, next) {
    debug.trace('get', '/own')
    const {sort, direction} = req.query;

    try {
        debug.debug('one')
        const books = await BookController.getBooksOfUser(req.session.user!);
        debug.debug('two', books[0])
        let sortedBooks = books.slice();
        // if (!!sort && !!direction) {
        //     if (sort === 'date') {
        //         sortedBooks = books.sort((a, b) => {
        //             if (direction === 'asc') {
        //                 return a.edition.publishDate.getTime() - b.edition.publishDate.getTime();
        //             } else {
        //                 return b.edition.publishDate.getTime() - a.edition.publishDate.getTime();
        //             }
        //         })
        //     }
        // }
        debug.debug('three')

        res.render('books/own', {title: 'Ma collection', books: sortedBooks});
    } catch (e) {
        debug.error(e)
        res.render('books/own', {
            title: 'Ma collection',
            books: [],
            pending: false,
            flash: {type: 'danger', title: 'Un erreur est intervenue, désolé'}
        });
    }
});

booksRouter.get('/upload', function (req, res, next) {
    debug.trace('get', '/upload')
    res.render('books/upload', {title: 'Mise a jour'});
});

booksRouter.post('/upload', async function (req, res, next) {
    debug.trace('post', '/upload')
    const user = req.session.user!;
    const job = AppDataSource.getRepository(Job).create({
        type: 'upload',
        creator: user,
        details: {
            login: req.body.login,
            password: AuthenticationController.encode(req.body.password)
        }
    })
    await AppDataSource.getRepository(Job).save(job);

    return res.redirect('/books');
});

booksRouter.get('/complete/:id?', async function (req, res, next) {
    debug.trace('get', '/complete/:id')

    if (!!req.params.id) {
        debug.debug('get', req.params.id)
        await WorkerController.refreshSeries(req.session.user!, +req.params.id);
    } else {
        await WorkerController.refreshAllSeries(req.session.user!);
    }

    res.redirect('/books');
});

booksRouter.get('/refresh/:ean', async function (req, res, next) {
    debug.trace('get', '/refresh/:ean')
    debug.debug(req.params.ean);
    await BrowserController.refreshBook(req.params.ean)

    res.redirect('/books#' + req.params.ean);
});

