import express from 'express';
import DebugFactory from '../utils/debug-factory';
import {Series, Book, BookEdition} from '../models';
import {WorkerController} from '../controllers';

const debug = new DebugFactory('warene:seriesRouter');
const arrAvg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length

export const seriesRouter = express.Router();

seriesRouter.get('/', async function (req, res, next) {
    debug.trace( 'get', '/')
    const series = await Series.findAll({include: [{model: Book, include: [BookEdition]}]});
    debug.debug( 'series.length', series.length);
    let data = series.map(s => {
        const inError = s.books.filter(b => !b.edition.pageCount || b.edition.pageCount === 0)
        debug.debug( s.name, Math.round(arrAvg(s.books.map(b => b.edition.pageCount || 0).filter(c => c !== 0))))
        const averagePagesInVolume = Math.round(arrAvg(s.books.map(b => b.edition.pageCount || 0).filter(c => c !== 0))) || 100;
        const totalInError = inError.length * averagePagesInVolume;
        const totalPages = s.books.map(b => b.edition.pageCount || 0).reduce((a, b) => a + b, 0) + totalInError;
        const readyToRead = s.books.filter(b => !b.isRead && !b.edition.lentTo && b.inCollection)
        const totalReadyToRead = readyToRead.map(b => b.edition.pageCount || 0).reduce((a, b) => a + b, 0);

        return {
            series: s,
            totalPages,
            totalReadyToRead,
            averagePagesInVolume
        }
    })

    const complete = data.filter(s => s.series.isAllBooksRead).sort((a, b) => a.series.name < b.series.name ? -1 : 1);
    data = data.filter(s => !complete.includes(s))

    const inErrors = data.filter(s => s.series.books.every(b => (b.edition.pageCount || 0) === 0)).sort((a, b) => a.series.books.length - b.series.books.length)
    data = data.filter(s => !inErrors.includes(s))

    const owned = data.filter(s => s.series.isAllBooksInCollection)
    data = data.filter(s => !owned.includes(s))

    const notOwnedButSomeOwnedAndNotTotallyRead = data.filter(s => s.totalReadyToRead > 0)
    const notOwnedButReadAllOwned = data.filter(s => !notOwnedButSomeOwnedAndNotTotallyRead.includes(s))

    res.render('series/all', {
        title: 'Collections', data: {
            owned: owned.sort((a, b) => a.totalReadyToRead - b.totalReadyToRead),
            data: [
                ...notOwnedButSomeOwnedAndNotTotallyRead.sort((a, b) => a.totalReadyToRead - b.totalReadyToRead),
                ...notOwnedButReadAllOwned.sort((a, b) =>
                    a.series.booksNotInCollection.reduce((c, b) => c + (b.edition.pageCount || 0) , 0)
                    - b.series.booksNotInCollection.reduce((c, b) => c + (b.edition.pageCount || 0), 0)
                )
            ],
            inErrors: inErrors.sort((a, b) => a.series.name < b.series.name ? -1 : 1),
            complete: complete.sort((a, b) => a.series.name < b.series.name ? -1 : 1)
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

