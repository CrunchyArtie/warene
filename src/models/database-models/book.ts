import {
    AllowNull,
    BelongsTo, BelongsToMany,
    Column,
    ForeignKey, HasMany,
    Model,
    Table,
} from 'sequelize-typescript'
import {Author, BookAuthor, Category, Collection, Series, Type} from '../index';
import {BookEdition} from './book-edition';

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
    volume!: number

    @HasMany(() => BookEdition)
    bookEditions!: BookEdition[];

    @BelongsToMany(() => Author, () => BookAuthor)
    authors!: Author[]

    get inCollection(): boolean {
        return this.bookEditions.some(e => e.inCollection);
    }

    get isRead(): boolean {
        return this.bookEditions.some(e => e.isRead);
    }

    get isAutographed(): boolean {
        return this.bookEditions.some(e => e.isAutographed);
    }

    get isOriginale(): boolean {
        return this.bookEditions.some(e => e.isOriginale);
    }

    get isLent(): boolean {
        return this.bookEditions.some(e => e.lentTo);
    }

    get lastEdition(): BookEdition {
        if (this.bookEditions.length === 0) {
            throw new Error('No editions found');
        }

        return this.bookEditions.sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime())[0];

    }

    get edition(): BookEdition {
        const ownedEditions = this.bookEditions.filter(e => e.inCollection);
        if (ownedEditions.length === 0) {
            return this.lastEdition
        }
        return ownedEditions.sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime())[0];
    }
}

