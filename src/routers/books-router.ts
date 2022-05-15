import express from 'express';
import {BookController, BrowserController} from '../controllers';
import debugFactory from 'debug';
import {Job, JobState, User} from '../models';

const debug = debugFactory('warene:bookRouter');

export const booksRouter = express.Router();

booksRouter.get('/', async function (req, res, next) {
    debug('trace', 'get', '/')
    res.redirect('/books/own');
});

booksRouter.get('/all', async function (req, res, next) {
    debug('trace', 'get', '/')
    const books = await BookController.getBooks();
    res.render('books/all', {title: 'Tout le contenu du site', books});
});

booksRouter.get('/own', async function (req, res, next) {
    debug('trace', 'get', '/own')
    try {

        const books = await BookController.getBooksOfUser(req.session.user!);
        const user = await User.findOne({
            where: {id: req.session.user!.id},
            include: [Job]
        })
        const allDone = user!.jobs.every(j => [JobState.completed, JobState.error].includes(j.state))
        res.render('books/own', {title: 'Ma collection', books, pending: !allDone });
    } catch (e) {
        debug('error', e)
        res.render('books/own', {title: 'Ma collection', books: [], pending: false, flash: {type: 'danger', title: 'Un erreur est intervenue, désolé'} });
    }
});

booksRouter.get('/upload', function (req, res, next) {
    debug('trace', 'get', '/upload')
    res.render('books/upload', {title: 'Mise a jour'});
});

booksRouter.post('/upload', async function (req, res, next) {
    debug('trace', 'post', '/upload')
    /* const job = */ await Job.create({
        type: 'upload',
        creatorId: req.session.user?.id,
        details: {
            login:req.body.login,
            password: req.body.password
        }
    });

    res.redirect('/books');
});

booksRouter.get('/complete', async function (req, res, next) {
    debug('trace', 'get', '/complete')
    await Job.create({
        type: 'complete',
        creatorId: req.session.user?.id,
        details: {
            state: 'initialize'
        }
    });

    res.redirect('/books');
});

booksRouter.get('/refresh/:ean', async function (req, res, next) {
    debug('trace', 'get', '/refresh/:ean')
    debug('debug', req.params.ean);
    await BrowserController.refreshBook(req.params.ean)

    res.redirect('/books#' + req.params.ean);
});
