import express from 'express';
import {BookController, BrowserController, SequelizeController} from '../controllers';
import debugFactory from 'debug';
import {User, Job, Series, Book} from '../models';
import {CompleteEachJobDetail} from '../models/job';

const debug = debugFactory('warene:bookRouter');

export const seriesRouter = express.Router();

seriesRouter.get('/', async function (req, res, next) {
    debug('trace', 'get', '/')
    const series = await Series.findAll({include: Book});
    // @ts-ignore
    const rawSqlResult: { jid: number, sid: number, state: 'completed' | 'error', error: null | string }[][] = await SequelizeController.query(`
        SELECT J.id as jid, S.id as sid, J.state, json_extract(J.details, '$.error') as error
        FROM Jobs as J
                 INNER JOIN Books as B ON json_extract(J.details, '$.book') = b.europeanArticleNumber
                 INNER JOIN Series S on B.seriesId = S.id
                 INNER JOIN (SELECT id, MAX(updatedOn) AS MaxDateTime
                             FROM Jobs
                             WHERE type = 'completeEach'
                             GROUP BY json_extract(details, '$.book')) AS LimitedJobs
                            ON J.id = LimitedJobs.id
    `)

    const data = series.filter(s => s.books.length > 1).map(s => {
        const totalPages = s.books.map(b => b.pageCount || 0).reduce((a, b) => a + b, 0);
        const totalRead = s.books.filter(b => b.isRead).map(b => b.pageCount || 0).reduce((a, b) => a + b, 0);
        const percentRead = (totalRead * 100 / totalPages).toFixed(2);
        const inError = rawSqlResult[0].find(line => line.sid === s.id)?.state === 'error'
        const orderedBooks = s.books.sort((a,b)=> a.volume - b.volume)
        return {
            series: s,
            orderedBooks,
            totalPages,
            totalRead,
            percentRead,
            inError
        }
    })

    res.render('series/all', {title: 'Collections', data});
});

seriesRouter.get('/:id', async function (req, res, next) {
    debug('trace', 'get', '/:id')
    const books = await Book.findAll({
        where: {seriesId: req.body.id},
        include: [Series]
    })
    res.render('series/detail', {title: books[0]?.series?.name || 'Oups', books});
});
