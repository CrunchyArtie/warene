import {
    AllowNull,
    BelongsTo,
    BelongsToMany,
    Column,
    CreatedAt,
    ForeignKey,
    Model, PrimaryKey,
    Table, Unique,
    UpdatedAt
} from 'sequelize-typescript'
import {Author, BookAuthor, BookUser, Category, Collection, Publisher, Series, Type, User} from './index';

@Table
export class Book extends Model {
    @ForeignKey(() => Series)
    @AllowNull
    @Column
    seriesId!: number
    @BelongsTo(() => Series)
    series!: Series

    @ForeignKey(() => Type)
    @AllowNull
    @Column
    typeId!: number
    @BelongsTo(() => Type)
    type!: Type

    @ForeignKey(() => Collection)
    @Column
    collectionId!: number
    @BelongsTo(() => Collection)
    collection!: Collection

    @ForeignKey(() => Category)
    @Column
    categoryId!: number
    @BelongsTo(() => Category)
    category!: Category

    @AllowNull
    @Column
    title!: string

    @Unique
    @PrimaryKey
    @Column
    europeanArticleNumber!: number

    @AllowNull
    @Column
    volume!: number

    @Column
    publishDate!: Date

    @ForeignKey(() => Publisher)
    @AllowNull
    @Column
    publisherId!: number
    @BelongsTo(() => Publisher)
    publisher!: Publisher

    @BelongsToMany(() => Author, () => BookAuthor)
    authors!: Author[]

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

    @CreatedAt
    creationDate!: Date;

    @UpdatedAt
    updatedOn!: Date;

    get prettyTitle() {
        const parts = [this.series?.name, this.collection?.name];

        if (!!this.volume) {
            parts.push(this.volume.toString())
        }

        if (parts.includes(this.title) === false)
            parts.push(this.title)

        return parts.filter(t => !!t).join(' - ')
    }
}

