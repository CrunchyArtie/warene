import {Author, Book, Category, Collection, Job, Publisher, Series, Type, User} from '../models';
import {RawBook} from '../models';
import debugFactory from 'debug';
import moment from 'moment';
import _ from 'lodash';
import {BrowserController} from './browser-controller';
import {Readable} from 'stream';
import csv from 'csv-parser';
import {CompleteEachJobDetail, CompleteJobDetail, ReloadCompleteJobDetail, UploadJobDetail} from '../models/job';
import {WorkerController} from './worker-controller';

const debug = debugFactory('warene:BookController');

export const BookController = {
    toBook: async (rawBook: Partial<RawBook> & Pick<RawBook, 'EAN'>) => {
        debug('trace', 'toBook');
        debug('debug', rawBook.EAN);
        const bookData: any = {};

        let series;
        if (_.has(rawBook, '﻿"Titre de la série"')) {
            series = (await Series.findOrCreate({
                where: {name: rawBook['﻿"Titre de la série"']?.trim()}
            }))[0]
            bookData.seriesId = series.id;
        }

        let type;
        if (!!rawBook.Type) {
            type = (await Type.findOrCreate({
                where: {name: rawBook.Type.trim()}
            }))[0]
            bookData.typeId = type.id;
        }

        let collection = undefined;
        if (!!rawBook.Collection) {
            collection = (await Collection.findOrCreate({
                where: {name: rawBook.Collection.trim()}
            }))[0]
            bookData.collectionId = collection.id;
        }

        let category
        if (_.has(rawBook, 'Catégory')) {
            category = (await Category.findOrCreate({
                where: {name: rawBook.Catégory?.trim()}
            }))[0]
            bookData.categoryId = category.id;
        }

        let publisher = undefined;
        if (!!rawBook.Editeur) {
            publisher = (await Publisher.findOrCreate({
                where: {name: rawBook.Editeur.trim()}
            }))[0]
            bookData.publisherId = publisher.id;
        }

        let authors = undefined;
        if (_.has(rawBook, 'Auteurs')) {
            authors = [];
            for (const rawAuthor of rawBook.Auteurs!.split(',')) {
                authors.push((await Author.findOrCreate({
                        where: {name: rawAuthor.trim()}
                    }))[0]
                )
            }
        }

        let volume;
        if (_.has(rawBook, 'Tome')) {
            // @ts-ignore on vient de tester si le champ existe
            volume = (+rawBook.Tome?.split('/')[0].trim()) || 0;
            volume = volume === 0 ? 1 : volume;
        }
        bookData.volume = volume;

        if (_.has(rawBook, 'Titre de l\'album'))
            bookData.title = (rawBook['Titre de l\'album'] || '').trim();
        if (_.has(rawBook, 'EAN'))
            bookData.europeanArticleNumber = +rawBook.EAN;
        if (_.has(rawBook, 'Date de publication'))
            bookData.publishDate = moment(rawBook['Date de publication']).toDate();
        if (_.has(rawBook, 'Prix'))
            bookData.price = +(rawBook.Prix?.replace('€', '')?.replace(',', '.')?.trim() || '0')
        if (_.has(rawBook, 'Date d\'ajout'))
            bookData.givenAddDate = moment(rawBook['Date d\'ajout']).toDate();
        if (_.has(rawBook, 'Dans ma collection'))
            bookData.inCollection = !!rawBook['Dans ma collection'];
        if (_.has(rawBook, 'Lu'))
            bookData.isRead = !!rawBook.Lu
        if (_.has(rawBook, 'Dédicacé'))
            bookData.isAutographed = !!rawBook.Dédicacé
        if (_.has(rawBook, 'Edition originale'))
            bookData.isOriginale = !!rawBook['Edition originale']
        if (_.has(rawBook, 'Prété à'))
            bookData.LentTo = (rawBook['Prété à'] || '').trim()
        if (_.has(rawBook, 'pageCount'))
            bookData.pageCount = (rawBook['pageCount'] || -1)

        Object.entries(bookData).forEach(([key, value]) => {
                if (value === undefined
                    || value === null
                    || value === ''
                    || value === -1
                    || value === NaN
                    || value === 0) {
                    delete bookData[key];
                }
            }
        );

        const book = (await Book.findOrCreate({
            where: {
                europeanArticleNumber: bookData.europeanArticleNumber
            },
            include: [
                Series,
                Type,
                Collection,
                Publisher,
                Author
            ]
        }))[0]

        await book.update(bookData);

        await book.$set('authors', []);
        if (authors) {
            for (let author of authors) {
                await book.$add('authors', author);
            }
        }
        await book.changed('updatedAt', true)
        await book.save();
        debug('debug', 'toBook', book.prettyTitle.trim(), 'Done');

        return book
    },
    getBooks: async () => {
        debug('trace', 'getBooks')
        const books = await Book.findAll({
            include: [Author, Publisher, Category, Collection, Series, Type]
        })
        return books || [];
    },
    getBooksOfUser: async (user: User) => {
        debug('trace', 'getBooksOfUser')
        const reLoadedUser = await User.findOne({
            where: {id: user.id},
            include: [{
                model: Book,
                include: [Author, Publisher, Category, Collection, Series, Type]
            }]
        })
        return reLoadedUser!.books || [];
    },
    getSeriesOfUser: async (user: User) => {
        debug('trace', 'getSeriesOfUser')
        return await Series.findAll({
            include: [{
                model: Book,
                required: true,
                include: [
                    {
                        model: User,
                        where: {id: user.id}
                    },
                    Author, Publisher, Category, Collection, Series, Type
                ]

            }]
        })
    },
    completeEach: async (job: Job<CompleteEachJobDetail>) => {
        try {
            debug('trace', 'completeEach')
            const user = await User.findOne({where: {id: job.creatorId}})
            const baseUrl = process.env.SCRAPPED_URL || 'https://books.toscrape.com/';
            const userBooks = await BookController.getBooksOfUser(user!);
            const book = userBooks.find(b => b.europeanArticleNumber === job.details.book);
            if (!book) {
                throw Error('Book not found');
            }
            await BrowserController.completeSeries(baseUrl, book);
        } catch (e) {
            await WorkerController.sleep(60*1000)
            throw e
        }
    },
    complete: async (job: Job<CompleteJobDetail>) => {
        debug('trace', 'complete')
        const user = await User.findOne({where: {id: job.creatorId}})
        const userBooks = await BookController.getBooksOfUser(user!);
        const userBooksWithSeries = userBooks.filter(u => !!u.series)
        const userBooksWithSeriesOrdered = userBooksWithSeries.sort((a, b) => b.updatedOn.getTime() - a.updatedOn.getTime()).reverse()
        const userBookWithUniqueSeries = _.uniqBy(userBooksWithSeriesOrdered, (elem) => elem.series.name)
        const data: Partial<Job<CompleteEachJobDetail>>[] = []
        for (const book of userBookWithUniqueSeries) {
            data.push({
                type: 'completeEach',
                creatorId: user?.id,
                details: {
                    parentJobId: job.id,
                    book: book.europeanArticleNumber
                }
            })
        }
        const childJobs = await Job.bulkCreate(data);
        job.details.childrenJobIds = childJobs.map(cj => cj.id);
        job.changed('details', true);
        return await job.save();
    },
    upload: async (job: Job<UploadJobDetail>) => {
        debug('trace', 'upload')
        const baseUrl = process.env.SCRAPPED_URL || 'https://books.toscrape.com/';
        const page = await BrowserController.connect(baseUrl)
        const user = await User.findOne({
            where: {id: job.creatorId},
            include: [Book]
        })
        await user!.$set('books', []);

        if (page) {
            await Promise.all([
                page.waitForNavigation(),
                page.click('.nav-link[href="/login"]')
            ]);
            const {login, password} = job.details;
            await page.fill('#emailform', login);
            await page.fill('#passwordform', password);

            await Promise.all([
                page.waitForNavigation(),
                page.click('.container button.btn.px-5.btn-lg.btn-secondary:has-text("Connexion")')
            ]);

            await Promise.all([
                page.waitForNavigation(),
                page.goto(baseUrl + '/my-account/my-settings')
            ]);

            const [download] = await Promise.all([
                page.waitForEvent('download'),
                page.locator('a:has-text("Exporter ma collection")').click()
            ]);
            const csvStream = await download.createReadStream()
            if (!!csvStream) {

                const handleCsv = async <T>(stream: Readable): Promise<T[]> => {
                    const results: T[] = [];
                    return new Promise((res, rej) => {
                        csvStream.pipe(csv({
                            separator: ';'
                        }))
                            .on('data', (data) => results.push(data))
                            .on('error', (err) => rej(err))
                            .on('end', () => {
                                res(results);
                            });
                    })
                }

                const books = []
                const csvResult = await handleCsv(csvStream);
                for (const line of csvResult) {
                    const book = await BookController.toBook(<RawBook>line);
                    await user!.$add('books', book);
                    books.push(book);
                }
            }
            download.delete();
        }

        await BrowserController.disconnect();
    },
    reloadComplete: async (job: Job<ReloadCompleteJobDetail>) => {
        debug('trace', 'reloadComplete')
        const data: Partial<Job<CompleteEachJobDetail>>[] = []
        for (const bookJobId of job.details.childrenJobIds) {
            const child = await Job.findByPk<Job<CompleteEachJobDetail>>(+bookJobId)
            const bookId = child?.details.book

            if (!bookId)
                throw Error('no book id found')

            data.push({
                type: 'completeEach',
                creatorId: job.creatorId,
                details: {
                    parentJobId: job.id,
                    book: bookId
                }
            })
        }
        const childJobs = await Job.bulkCreate(data);
        job.details.childrenJobIds = childJobs.map(cj => cj.id);
        job.changed('details', true);
        return await job.save();
    }
}
