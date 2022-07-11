import {
    Author,
    Book,
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
import {BookEdition} from '../models/database-models/book-edition';
import {AuthenticationController} from './index';
import {Includeable} from 'sequelize';
import {toVolumeNumber} from '../utils/helpers';

const debug = new DebugFactory('warene:BookController');

class BookController {
    public async toBook(rawBook: Partial<RawBook> & Pick<RawBook, 'EAN'>) {
        debug.trace('toBook');
        debug.debug(rawBook.EAN);
        const bookData: Partial<Pick<Book, 'volume' | 'seriesId' | 'typeId' | 'categoryId' | 'collectionId'>> = {}
        const bookEditionData: Partial<Pick<BookEdition, 'europeanArticleNumber' | 'title' | 'publisherId' | 'publishDate' | 'price' | 'givenAddDate' | 'inCollection' | 'isRead' | 'isAutographed' | 'isOriginale' | 'lentTo' | 'link' | 'pageCount'>> = {}

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
            bookEditionData.publisherId = publisher.id;
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
            volume = toVolumeNumber(rawBook.Tome);
            volume = volume === 0 ? 1 : volume;
        }
        bookData.volume = volume;

        if (_.has(rawBook, 'Titre de l\'album'))
            bookEditionData.title = (rawBook['Titre de l\'album'] || '').trim();
        if (_.has(rawBook, 'EAN'))
            bookEditionData.europeanArticleNumber = +rawBook.EAN;
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

        const bookEdition = (await BookEdition.findOrCreate({
            where: {
                europeanArticleNumber: bookEditionData.europeanArticleNumber
            },
            include: [{all: true, nested: true}]
        }))[0]

        let book = bookEdition.book;
        if (!book) {
            book = (await Book.findOrCreate({
                where: {volume: bookData.volume, seriesId: bookData.seriesId},
                include: [
                    {model: BookEdition, where: {europeanArticleNumber: bookEditionData.europeanArticleNumber}},
                    {all: true, nested: true}
                ]
            }))[0];
            if (!book && !!bookEdition.title) {
                book = (await Book.findOrCreate({
                    where: {volume: bookData.volume, seriesId: bookData.seriesId},
                    include: [
                        {model: BookEdition, where: {title: bookEditionData.title}},
                        {all: true, nested: true}
                    ]
                }))[0];
            }
            if (!book) {
                book = await Book.create();
            }
            await bookEdition.$set('book', book);
        }

        await bookEdition.update(bookEditionData);
        await book.update(bookData);

        await book.$set('authors', []);
        if (authors) {
            for (let author of authors) {
                await book.$add('authors', author);
            }
        }
        await bookEdition.changed('updatedAt', true)
        await book.changed('updatedAt', true)
        await book.save();
        const updatedBookEdition = await (await bookEdition.save()).reload({include: [{all: true, nested: true}]});
        debug.debug('toBook', updatedBookEdition.prettyTitle.trim(), 'Done');

        return updatedBookEdition;
    }

    public async getBooks(include: Includeable[]): Promise<Book[]> {
        debug.trace('getBooks')

        const books = await Book.findAll({
            include: [Series, ...include],
            order: [[{model: Series, as: 'series'}, 'name']]
        })
        return books || [];
    }

    public async getBooksOfUser(user: User): Promise<Book[]> {
        debug.trace('getBooksOfUser')
        const loadedUser = (await User.findByPk(user.id, {
            include: [{
                model: BookEdition,
                include: [{
                    model: Book,
                    include: [
                        Author,
                        Category,
                        Author,
                        Collection,
                        Type,
                        BookEdition
                    ]
                }]
            }]
        }));

        if (!loadedUser) throw new Error('User not found');
        return loadedUser.bookEditions.map(book => book.book);
    }

    public async getSeriesOfUser(user: User, include: (Includeable | Includeable[])): Promise<Series[]> {
        debug.trace('getSeriesOfUser')
        return await Series.findAll({
            include: include
        })
    }

    /**
     * Go to the site, login in, go to user informations, download csv
     * @param job
     */
    public async upload(job: Job<UploadJobDetail>): Promise<void> {
        debug.trace('upload')

        const {login, password} = job.details;
        const rawBooks = await BrowserController.getRawBooks(login, AuthenticationController.decode(password))
        const books = [];
        for (const rawBook of rawBooks) {
            books.push(await this.toBook(rawBook));
        }
        const user = await User.findOne({
            where: {id: job.creatorId},
            include: [{all: true, nested: true}]
        })
        debug.info('new books collection size', books.length)
        await user!.$set('bookEditions', books);
        await user?.save();
    }

    public async getBooksFromSeries(seriesList: Series[], include: Includeable | Includeable[]) {
        return await Book.findAll({where: {seriesId: seriesList.map(s => s.id)}, include: include})
    }
}

export default new BookController();
