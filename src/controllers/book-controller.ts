import {Author, Book, Category, Collection, Job, Publisher, Series, Type, User, RawBook} from '../models';
import DebugFactory from '../utils/debug-factory';
import moment from 'moment';
import _ from 'lodash';
import BrowserController from './browser-controller';
import {UploadJobDetail} from '../models';

const debug = new DebugFactory('warene:BookController');

class BookController {
    public async toBook(rawBook: Partial<RawBook> & Pick<RawBook, 'EAN'>) {
        debug.trace( 'toBook');
        debug.debug( rawBook.EAN);
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
        debug.debug( 'toBook', book.prettyTitle.trim(), 'Done');

        return book
    }

    public async getBooks(): Promise<Book[]> {
        debug.trace( 'getBooks')
        const books = await Book.findAll({
            include: [Author, Publisher, Category, Collection, Series, Type],
            order: [[{model: Series, as: 'series'}, 'name']]
        })
        return books || [];
    }

    public async getBooksOfUser(user: User): Promise<Book[]> {
        debug.trace( 'getBooksOfUser')
        const reLoadedUser = await User.findOne({
            where: {id: user.id},
            include: [{
                model: Book,
                include: [Author, Publisher, Category, Collection, Series, Type]
            }]
        })
        return reLoadedUser!.books || [];
    }

    public async getSeriesOfUser(user: User): Promise<Series[]> {
        debug.trace( 'getSeriesOfUser')
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
    }

    /**
     * Go to the site, login in, go to user informations, download csv
     * @param job
     */
    public async upload(job: Job<UploadJobDetail>): Promise<void> {
        debug.trace( 'upload')

        const {login, password} = job.details;
        const rawBooks = await BrowserController.getRawBooks(login, password)
        const books = [];
        for(const rawBook of rawBooks) {
            books.push(await this.toBook(rawBook));
        }
        const user = await User.findOne({
            where: {id: job.creatorId},
            include: [Book]
        })
        debug.info( 'new books collection size', books.length )
        await user!.$set('books', books);
        await user?.save();
    }

    public async getBooksFromSeries(...seriesList: Series[]) {
        return await Book.findAll({where: {seriesId: seriesList.map(s => s.id)}})
    }
}

export default new BookController();
