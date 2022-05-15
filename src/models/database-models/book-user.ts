import {Column, ForeignKey, Model, Table} from 'sequelize-typescript';
import {Book} from './book';
import {User} from './user';

@Table
export class BookUser extends Model {
    @ForeignKey(() => Book)
    @Column
    bookId!: number

    @ForeignKey(() => User)
    @Column
    userId!: number
}
