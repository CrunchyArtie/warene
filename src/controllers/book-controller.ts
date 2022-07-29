import {
    Author,
    Book,
    BookData,
    BookEdition,
    BookEditionData,
    Category,
    Collection,
    Job,
    Publisher,
    RawBook,
    Series,
    Type,
    UploadJobDetail,
    User
} from '../models';
import DebugFactory from '../utils/debug-factory';
import moment from 'moment';
import _ from 'lodash';
import BrowserController from './browser-controller';
import {AuthenticationController} from './index';
import {toVolumeNumber} from '../utils/helpers';
import {AppDataSource} from '../utils/app-data-source';
import {In} from 'typeorm';

const debug = new DebugFactory('warene:BookController');
const seriesRepository = AppDataSource.getRepository(Series);
const typeRepository = AppDataSource.getRepository(Type);
const collectionRepository = AppDataSource.getRepository(Collection);
const categoryRepository = AppDataSource.getRepository(Category);
const publisherRepository = AppDataSource.getRepository(Publisher);
const authorRepository = AppDataSource.getRepository(Author);
const bookEditionRepository = AppDataSource.getRepository(BookEdition);
const bookRepository = AppDataSource.getRepository(Book);
const userRepository = AppDataSource.getRepository(User);

class BookController {
    public async toBook(rawBook: Partial<RawBook> & Pick<RawBook, 'EAN'>) {
        debug.trace('toBook');
        debug.debug(rawBook.EAN);

        const bookData: BookData = {}
        const bookEditionData: BookEditionData = {}

        let series;
        if (_.has(rawBook, '﻿"Titre de la série"')) {
            const name = rawBook['﻿"Titre de la série"']?.trim()
            series = (await seriesRepository.findOneBy({name}))

            if (!series) {
                debug.debug('1', 'series not found, creating it', series);
                series = seriesRepository.create({name})
                series = await seriesRepository.save(series)
            }

            bookData.series = series;
        }
        debug.debug('2', 'series', series);

        let type;
        if (!!rawBook.Type) {
            const name = rawBook.Type.trim();
            type = (await typeRepository.findOneBy({name}))
            if (!type) {
                debug.debug('3', 'type not found, creating it', type);
                type = typeRepository.create({name})
                type = await typeRepository.save(type)
            }
            bookData.type = type;
        }
        debug.debug('4', 'type', type);

        let collection = undefined;
        if (!!rawBook.Collection) {
            const name = rawBook.Collection.trim();
            collection = (await collectionRepository.findOneBy({name}))
            if (!collection) {
                debug.debug('5', 'collection not found, creating it', collection);
                collection = collectionRepository.create({name})
                collection = await collectionRepository.save(collection)
            }
            bookData.collection = collection;
        }
        debug.debug('6', 'collection', collection);

        let category = undefined;
        if (!!rawBook.Catégory) {
            const name = rawBook.Catégory.trim();
            category = (await categoryRepository.findOneBy({name}))
            if (!category) {
                debug.debug('7', 'category not found, creating it', category);
                category = categoryRepository.create({name})
                category = await categoryRepository.save(category)
            }
            bookData.category = category;
        }
        debug.debug('8', 'category', category);

        let publisher = undefined;
        if (!!rawBook.Editeur) {
            let name = rawBook.Editeur.trim();
            publisher = await publisherRepository.findOneBy({name})
            if (!publisher) {
                debug.debug('publisher not found, creating it', publisher);
                publisher = publisherRepository.create({name})
                publisher = await publisherRepository.save(publisher)
            }
            bookEditionData.publisher = publisher;
        }
        debug.debug('9', 'publisher', publisher);

        let authors = undefined;
        if (_.has(rawBook, 'Auteurs')) {
            authors = [];
            for (const rawAuthor of rawBook.Auteurs!.split(',')) {
                let name = rawAuthor.trim();
                let author = await authorRepository.findOneBy({name});
                if (!author) {
                    debug.debug('10', 'author not found, creating it', author);
                    author = authorRepository.create({name})
                    author = await authorRepository.save(author)
                }

                authors.push(author);
            }
        }
        debug.debug('11', 'authors', authors);

        let volume;
        if (_.has(rawBook, 'Tome')) {
            // @ts-ignore on vient de tester si le champ existe
            volume = toVolumeNumber(rawBook.Tome);
            volume = volume === 0 ? 1 : volume;
        }
        bookData.volume = volume;
        debug.debug('12', 'volume', volume);

        if (_.has(rawBook, 'Titre de l\'album'))
            bookEditionData.title = (rawBook['Titre de l\'album'] || '').trim();
        if (_.has(rawBook, 'EAN'))
            bookEditionData.europeanArticleNumber = +rawBook.EAN + '';
        if (_.has(rawBook, 'Date de publication'))
            bookEditionData.publishDate = moment(rawBook['Date de publication']).toDate();
        if (_.has(rawBook, 'Prix'))
            bookEditionData.price = +(rawBook.Prix?.replace('€', '')?.replace(',', '.')?.trim() || '0')
        if (_.has(rawBook, 'Date d\'ajout'))
            bookEditionData.givenAddDate = moment(rawBook['Date d\'ajout']).toDate();
        if (_.has(rawBook, 'Dans ma collection'))
            bookEditionData.inCollection = !!rawBook['Dans ma collection'];
        if (_.has(rawBook, 'Lu'))
            bookEditionData.isRead = !!rawBook.Lu
        if (_.has(rawBook, 'Dédicacé'))
            bookEditionData.isAutographed = !!rawBook.Dédicacé
        if (_.has(rawBook, 'Edition originale'))
            bookEditionData.isOriginale = !!rawBook['Edition originale']
        if (_.has(rawBook, 'Prété à'))
            bookEditionData.lentTo = (rawBook['Prété à'] || '').trim()
        if (_.has(rawBook, 'pageCount'))
            bookEditionData.pageCount = (rawBook['pageCount'] || -1)
        debug.debug('13', 'bookEditionData', bookEditionData);

        Object.entries(bookData).forEach(([key, value]) => {
                if (value === undefined
                    || value === null
                    || value === -1
                    || value === NaN
                    || value === 0) {
                    delete (<any>bookData)[key];
                }
            }
        );
        debug.debug('14', 'bookData', bookData);

        Object.entries(bookEditionData).forEach(([key, value]) => {
                if (value === undefined
                    || value === null
                    || value === ''
                    || value === -1
                    || value === NaN
                    || value === 0) {
                    delete (<any>bookEditionData)[key];
                }
            }
        );
        debug.debug(15, 'bookEditionData', bookEditionData);

        let bookEdition = await bookEditionRepository.findOne({
            where: {europeanArticleNumber: bookEditionData.europeanArticleNumber},
            relations: ['book.series']
        });

        if (!bookEdition) {
            debug.debug(16, 'no bookEdition found, creating one', bookEditionData);
            bookEdition = new BookEdition(bookEditionData);
            bookEdition = await bookEditionRepository.create(bookEdition);
        }

        let book: Book | null = bookEdition.book;
        if (!book) {
            book = await bookRepository.findOne({
                where: {
                    volume: bookData.volume,
                    series: {id: bookData.series!.id}
                    // bookEditions: {europeanArticleNumber: bookEdition.europeanArticleNumber}
                },
                relations: ['bookEditions', 'series']
            });

            // if (!book && !!bookEdition.title) {
            //     book = await bookRepository.findOne({
            //         where: {
            //             volume: bookData.volume,
            //             series: {id: bookData.series!.id},
            //             bookEditions: {title: bookEdition.title}
            //         },
            //         relations: {bookEditions: true, series: true}
            //     });
            // }

            if (!book) {
                debug.debug(17, 'no book found, creating one', book);
                book = new Book(bookData);
                book = await bookRepository.save(book);
            }
            bookEdition.book = book;
        }

        debug.debug(18, 'book', book);
        debug.debug(19, 'bookEdition', bookEdition);
        Object.assign(bookEdition, bookEditionData);
        Object.assign(book, bookData);
        book.authors = authors || [];
        book = await bookRepository.save(book);
        // bookEdition = await bookEditionRepository.save(bookEdition);
        bookEdition.book = book;
        bookEdition = await bookEditionRepository.save(bookEdition);

        debug.debug(20, 'book.bookEditions', book.bookEditions);
        debug.debug(21, 'bookEdition.book', bookEdition.book);
        bookEdition = await bookEditionRepository.findOne({
            where: {europeanArticleNumber: bookEdition.europeanArticleNumber},
            relations: ['book.series']
        });
        debug.debug(20, 'toBook', bookEdition?.prettyTitle.trim(), 'Done');

        return bookEdition!;
    }

    public async getBooks(): Promise<Book[]> {
        debug.trace('getBooks')

        const books = await bookRepository.find({relations: ['bookEditions.book.series', 'category', 'authors', 'bookEditions.publisher']});
        return books || [];
    }

    public async getBooksOfUser(user: User): Promise<Book[]> {
        debug.trace('getBooksOfUser')
        debug.debug('user', user.id)
        const reloadedUser = await AppDataSource.getRepository(User).findOneOrFail({
            where: {id: user.id}, relations: [
                // 'bookEditions',
                // 'bookEditions.publisher',
                'bookEditions.book.bookEditions.publisher',
                'bookEditions.book.series',
                'bookEditions.book.authors',
                'bookEditions.book.category',
                'bookEditions.book.type',
                'bookEditions.book.collection'

            ]
        });
        debug.debug('reloadedUser.bookEditions.map(b => b.book)[0]', reloadedUser.bookEditions.map(b => b.book)[0])
        return reloadedUser.bookEditions.map(bookEdition => bookEdition.book);
        // const books = await bookRepository.find({
        //     where: {
        //         bookEditions: {
        //             owners: {id: user.id}
        //         }
        //     },
        //     relations: [
        //         'series',
        //         'authors',
        //         'category',
        //         'type',
        //         'collection',
        //         'bookEditions.owners',
        //         'bookEditions.publisher',
        //         'bookEditions.book.series',
        //         'bookEditions.book.authors',
        //         'bookEditions.book.category',
        //         'bookEditions.book.type',
        //         'bookEditions.book.collection',
        //     ]
        // })
        // return books || [];
    }

    public async getSeriesOfUser(user: User): Promise<Series[]> {
        debug.trace('getSeriesOfUser')
        const series = await seriesRepository.find({
            where: {books: {bookEditions: {owners: {id: user.id}}}},
            relations: {books: {bookEditions: {owners: true}}}
        });
        return series || [];
    }

    /**
     * Go to the site, login in, go to user informations, download csv
     * @param job
     */
    public async upload(job: Job<UploadJobDetail>): Promise<void> {
        debug.trace('upload')

        const {login, password} = job.details;
        const rawBooks = await BrowserController.getRawBooks(login, AuthenticationController.decode(password))
        const bookEditions = [];
        for (const rawBook of rawBooks) {
            bookEditions.push(await this.toBook(rawBook));
        }
        const user = await userRepository.findOne({
            where: {id: job.creator.id},
            relations: {bookEditions: true}
        })
        debug.debug('job.creator', job.creator);
        debug.info('new books collection size', bookEditions.length)
        user!.bookEditions = [];
        await userRepository.save(user!);
        user!.bookEditions = await bookEditionRepository.save(bookEditions);
        await userRepository.save(user!);
    }

    public async getBooksFromSeries(seriesList: Series[]) {
        return await bookRepository.find({
            where: {series: {id: In(seriesList.map(s => s.id))}},
            relations: ['bookEditions.book', 'series']
        });
    }
}

export default new BookController();
