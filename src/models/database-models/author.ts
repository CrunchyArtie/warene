import {BelongsToMany, Column, Model, Table} from 'sequelize-typescript';
import {Book} from './book';
import {BookAuthor} from './book-author';

@Table
export class Author extends Model {
    @Column
    name!: string;

    @BelongsToMany(() => Book, () => BookAuthor)
    books!: Book[]
}
