import {Column, HasMany, Model, Table} from 'sequelize-typescript';
import {Book} from './book';

@Table
export class Series extends Model {
    @Column
    name!: string

    @HasMany(() => Book)
    books!: Book[]

    @Column
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


}

