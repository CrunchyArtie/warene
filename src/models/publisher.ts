import {Column, HasMany, Model, Table} from 'sequelize-typescript';
import {Book} from './book';
import {SequelizeController} from '../controllers';

@Table
export class Publisher extends Model {
    @Column
    name!: string

    @HasMany(() => Book)
    books!: Book[]
}
// SequelizeController.addModels([Publisher])

