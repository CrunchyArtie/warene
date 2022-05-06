import {
    Table,
    Column,
    Model,
    CreatedAt,
    UpdatedAt,
    DataType,
    Unique,
    Index,
    BelongsToMany, HasMany
} from 'sequelize-typescript'
import {Book} from './book';
import {BookUser} from './book-user';
import {Job} from './job';

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

    @CreatedAt
    creationDate!: Date;

    @UpdatedAt
    updatedOn!: Date;

    @BelongsToMany(() => Book, () => BookUser)
    books!: Book[]

    @HasMany(() => Job, 'creatorId')
    jobs!: Job<any>[]

}
