import {Column, Model, Table} from 'sequelize-typescript';

@Table
export class Config extends Model {
    @Column
    name!: string;

    @Column
    value!: string
}
