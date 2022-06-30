import {
    AllowNull,
    BelongsTo,
    BelongsToMany,
    Column,
    ForeignKey,
    Model, PrimaryKey,
    Table, Unique,
} from 'sequelize-typescript'
import {Book, BookUser, Publisher, User} from '../index';

@Table
export class BookEdition extends Model {
    @ForeignKey(() => Book)
    @Column
    bookId!: number
    @BelongsTo(() => Book)
    book!: Book

    @AllowNull
    @Column
    title?: string

    @Unique
    @PrimaryKey
    @Column
    europeanArticleNumber!: number

    @Column
    publishDate!: Date

    @ForeignKey(() => Publisher)
    @AllowNull
    @Column
    publisherId!: number
    @BelongsTo(() => Publisher)
    publisher!: Publisher

    @BelongsToMany(() => User, () => BookUser)
    owners!: User[]

    @Column
    price!: number

    @Column
    givenAddDate!: Date

    @Column
    inCollection!: boolean

    @Column
    isRead!: boolean

    @Column
    isAutographed!: boolean

    @Column
    isOriginale!: boolean

    @Column
    lentTo!: string

    @Column
    link!: string

    @AllowNull
    @Column
    pageCount!: number

    get prettyTitle() {
        const parts = [this.book?.series?.name, this.book?.collection?.name];

        if (!!this.book?.volume) {
            parts.push(this.book?.volume.toString())
        }

        if (!!this.title && parts.includes(this.title) === false)
            parts.push(this.title)

        return parts.filter(t => !!t).join(' - ')
    }
}

