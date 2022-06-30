import {
    Table,
    Column,
    Model,
    DataType,
    Unique,
    Index,
    BelongsToMany, HasMany
} from 'sequelize-typescript'
import {BookUser} from './book-user';
import {Job} from './job';
import {BookEdition} from './book-edition';

@Table
export class User extends Model {
    @Column({
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
        type: DataType.UUID
    })
    id!: string

    @Unique
    @Index
    @Column
    username!: string

    @Column
    password!: string

    @BelongsToMany(() => BookEdition, () => BookUser)
    books!: BookEdition[]

    @HasMany(() => Job, 'creatorId')
    jobs!: Job<any>[]

}
