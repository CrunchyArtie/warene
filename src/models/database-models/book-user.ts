import {Column, DataType, ForeignKey, Model, Table} from 'sequelize-typescript';
import {User} from './user';
import {BookEdition} from './book-edition';

@Table
export class BookUser extends Model {
    @ForeignKey(() => BookEdition)
    @Column({type: DataType.BIGINT})
    bookId!: number

    @ForeignKey(() => User)
    @Column({type: DataType.UUID})
    userId!: number
}
