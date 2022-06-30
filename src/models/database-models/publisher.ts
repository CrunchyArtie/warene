import {Column, HasMany, Model, Table} from 'sequelize-typescript';
import {BookEdition} from './book-edition';

@Table
export class Publisher extends Model {
    @Column
    name!: string

    @HasMany(() => BookEdition)
    books!: BookEdition[]
}

