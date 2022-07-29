import {Author, Category, Collection, Series, Type, BookEdition} from '../index';
import {Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm';

export type BookData = Partial<Pick<Book, 'volume' | 'series' | 'type' | 'category' | 'collection'>>;

@Entity()
export class Book {

    constructor(data: BookData = {}) {
        Object.assign(this, data);
    }

    @PrimaryGeneratedColumn()
    id!: number

    @Column({nullable: false, type: "real"})
    volume!: number

    @ManyToOne(() => Series, (series) => series.books)
    series!: Series

    @ManyToOne(() => Type, (type) => type.books)
    type!: Type

    @ManyToOne(() => Collection, (collection) => collection.books,)
    collection!: Collection

    @ManyToOne(() => Category, (category) => category.books)
    category!: Category

    @OneToMany(() => BookEdition, (bookEdition) => bookEdition.book)
    bookEditions!: BookEdition[];

    @ManyToMany(() => Author, (author) => author.books)
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
            throw new Error(['No editions found :', this.id, this.series?.name, this.volume].join(' '));
        }

        return this.bookEditions.sort((a, b) => b.publishDate?.getTime() - a.publishDate?.getTime())[0];

    }

    get edition(): BookEdition {
        const ownedEditions = this.bookEditions.filter(e => e.inCollection);
        if (ownedEditions.length === 0) {
            return this.lastEdition
        }
        return ownedEditions.sort((a, b) => b.publishDate?.getTime() - a.publishDate?.getTime())[0];
    }
}

