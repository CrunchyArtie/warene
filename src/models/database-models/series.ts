import {Book} from './book';
import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class Series {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string

    @OneToMany(() => Book, (book) => book.series)
    books!: Book[]

    @Column({nullable: true})
    link!: string

    get isAllBooksInCollection() {
        return this.books.every(b => b.inCollection)
    }

    get booksInCollection() {
        return this.books.filter(b => b.inCollection)
    }

    get booksNotInCollection() {
        return this.books.filter(b => !b.inCollection)
    }

    get isAllBooksRead() {
        return this.books.every(b => b.isRead)
    }

    get booksRead() {
        return this.books.filter(b => b.isRead)
    }

    get booksNotRead() {
        return this.books.filter(b => !b.isRead)
    }

    public getBooksInError() {
        return this.books.filter(b => !b.edition.pageCount || b.edition.pageCount === 0)
    }

    public getAveragePagesPerBooks() {
        const arrAvg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
        return Math.round(arrAvg(this.books.map(b => b.edition.pageCount || 0).filter(c => c !== 0))) || 100
    }

    public getTotalOfErrorsPages() {
        return this.getBooksInError().length * this.getAveragePagesPerBooks();
    }

    public getTotalPages() {
        return this.books.map(b => b.edition.pageCount || 0).reduce((a, b) => a + b, 0) + this.getTotalOfErrorsPages();
    }

    public getReadyToReadBooks() {
        return this.books.filter(b => !b.isRead && /*!b.edition.lentTo &&*/ b.inCollection)
    }

    public getReadyToReadPages() {
        return this.getReadyToReadBooks().map(b => b.edition.pageCount || 0).reduce((a, b) => a + b, 0);
    }
}

