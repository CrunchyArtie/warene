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
}

