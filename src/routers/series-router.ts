import express from 'express';
import debugFactory from 'debug';
import {Series, Book} from '../models';

const debug = debugFactory('warene:seriesRouter');

export const seriesRouter = express.Router();

seriesRouter.get('/', async function (req, res, next) {
    debug('trace', 'get', '/')
    const series = await Series.findAll({include: Book});
    const arrAvg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
    let data = series.map(s => {
        const inError = s.books.filter(b => !b.pageCount || b.pageCount === 0)
        const averagePagesInVolume = Math.round(arrAvg(s.books.map(b => b.pageCount || 0).filter(c => !0))) || 100;
        const totalInError = inError.length * averagePagesInVolume;
        const totalPages = s.books.map(b => b.pageCount || 0).reduce((a, b) => a + b, 0) + totalInError;
        const readyToRead = s.books.filter(b => !b.isRead && !b.lentTo && b.inCollection)
        const totalReadyToRead = readyToRead.map(b => b.pageCount || 0).reduce((a, b) => a + b, 0);

        return {
            series: s,
            totalPages,
            totalReadyToRead,
            averagePagesInVolume
        }
    })

    const inErrors = data.filter(s => s.series.books.every(b => (b.pageCount || 0) === 0)).sort((a, b) => a.series.books.length - b.series.books.length)
    debug('debug', 'inErrors', inErrors.map(d => d.series.name))
    data = data.filter(s => !inErrors.includes(s)).sort((a, b) => a.totalReadyToRead - b.totalReadyToRead)
    const complete = data.filter(s => s.series.books.every(b => b.isRead)).sort((a, b) => a.series.name < b.series.name ? -1 : 1);
    data = data.filter(s => !complete.includes(s))
    const owned = data.filter(s => s.series.books.every(b => b.inCollection)).sort((a, b) => a.totalReadyToRead - b.totalReadyToRead)
    data = data.filter(s => !owned.includes(s)).sort((a, b) => a.totalReadyToRead - b.totalReadyToRead)


    res.render('series/all', {
        title: 'Collections', data: {
            owned,
            data,
            inErrors,
            complete
        }
    });
});

seriesRouter.get('/:id', async function (req, res, next) {
    debug('trace', 'get', '/:id')
    const books = await Book.findAll({
        where: {seriesId: req.body.id},
        include: [Series]
    })
    res.render('series/detail', {title: books[0]?.series?.name || 'Oups', books});
});
