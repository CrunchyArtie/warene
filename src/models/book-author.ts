import {Column, ForeignKey, Model, Table} from 'sequelize-typescript';
import {Author} from './author';
import {Book} from './book';

@Table
export class BookAuthor extends Model {
    @ForeignKey(() => Book)
    @Column
    bookId!: number

    @ForeignKey(() => Author)
    @Column
    authorId!: number
}
