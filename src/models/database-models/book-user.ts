import {Column, DataType, ForeignKey, Model, Table} from 'sequelize-typescript';
import {Book} from './book';
import {User} from './user';

@Table
export class BookUser extends Model {
    @ForeignKey(() => Book)
    @Column
    bookId!: number

    @ForeignKey(() => User)
    @Column({type: DataType.UUID})
    userId!: number
}
