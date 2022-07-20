import express from 'express';
import DebugFactory from '../utils/debug-factory';
import {Series, Book, BookEdition} from '../models';
import {WorkerController} from '../controllers';
import {AppDataSource} from '../utils/app-data-source';

const debug = new DebugFactory('warene:seriesRouter');
const seriesRepository = AppDataSource.getRepository(Series);
export const seriesRouter = express.Router();

seriesRouter.get('/', async function (req, res, next) {
    debug.trace( 'get', '/')
    const seriesList = await seriesRepository.find({relations: {books: {bookEditions: {book: true}}}});
    debug.debug( 'seriesList.length', seriesList.length);
    // debug.debug( 'mémoire', seriesList.find(s => s.name.includes('Mémoire'))?.books[0].edition.pageCount);
    // debug.debug( 'mémoire', seriesList.find(s => s.name.includes('Mémoire'))?.getReadyToReadPages());
    let data = seriesList.slice()

    const complete = data.filter(s => s.isAllBooksRead).sort((a, b) => a.name < b.name ? -1 : 1);
    data = data.filter(s => !complete.includes(s))

    const inErrors = data.filter(s => s.books.every(b => (b.edition.pageCount || 0) === 0)).sort((a, b) => a.books.length - b.books.length)
    data = data.filter(s => !inErrors.includes(s))

    const owned = data.filter(s => s.isAllBooksInCollection).sort((a, b) => a.getReadyToReadPages() - b.getReadyToReadPages())
    // debug.debug(owned.map(s =>  [s.getReadyToReadPages(), s.name]))

    data = data.filter(s => !owned.includes(s))

    const notOwnedButSomeOwnedAndNotTotallyRead = data.filter(s => s.getReadyToReadBooks().length > 0).sort((a, b) => a.getReadyToReadPages() - b.getReadyToReadPages())

    const notOwnedButReadAllOwned = data.filter(s => !notOwnedButSomeOwnedAndNotTotallyRead.includes(s))

    res.render('series/all', {
        title: 'Collections', data: {
            owned,
            data: [
                ...notOwnedButSomeOwnedAndNotTotallyRead,
                ...notOwnedButReadAllOwned.sort((a, b) =>
                    a.booksNotInCollection.reduce((c, b) => c + (b.edition.pageCount || 0) , 0)
                    - b.booksNotInCollection.reduce((c, b) => c + (b.edition.pageCount || 0), 0)
                )
            ],
            inErrors: inErrors.sort((a, b) => a.name < b.name ? -1 : 1),
            complete: complete.sort((a, b) => a.name < b.name ? -1 : 1)
        }
    });
});

seriesRouter.get('/complete/:id', async function (req, res, next) {
    debug.trace( 'get', '/complete')
    debug.debug( req.params.id)

    if (!!req.params.id) {
        await WorkerController.refreshSeries(req.session.user!, +req.params.id);
    } else {
        await WorkerController.refreshAllSeries(req.session.user!);
    }

    res.redirect('/series');
});

