import {Book, Publisher, User} from '../index';
import {Column, Entity, ManyToMany, ManyToOne, PrimaryColumn} from 'typeorm';
import DebugFactory from '../../utils/debug-factory';

const debug = new DebugFactory('warene:BookEdition');

export type BookEditionData = Partial<Pick<BookEdition, 'europeanArticleNumber' | 'title' | 'publisher' | 'publishDate' | 'price' | 'givenAddDate' | 'inCollection' | 'isRead' | 'isAutographed' | 'isOriginale' | 'lentTo' | 'link' | 'pageCount'>>;

@Entity()
export class BookEdition {

    constructor(data: BookEditionData = {}) {
        Object.assign(this, data);
    }

    @PrimaryColumn('bigint')
    europeanArticleNumber!: string

    @Column({nullable: true})
    title?: string

    @Column({nullable: true})
    publishDate!: Date

    @Column({type: "real", nullable: true})
    price!: number

    @Column({nullable: true})
    givenAddDate!: Date

    @Column({nullable: true})
    inCollection!: boolean

    @Column({nullable: true})
    isRead!: boolean

    @Column({nullable: true})
    isAutographed!: boolean

    @Column({nullable: true})
    isOriginale!: boolean

    @Column({nullable: true})
    lentTo!: string

    @Column({nullable: true})
    link!: string

    @Column({nullable: true})
    pageCount!: number

    @ManyToOne(() => Book, (book) => book.bookEditions)
    book!: Book

    @ManyToOne(() => Publisher, (publisher) => publisher.bookEditions)
    publisher!: Publisher

    @ManyToMany(() => User, (user) => user.bookEditions)
    owners!: User[]

    get prettyTitle() {
        const parts = [this.book?.series?.name, this.book?.collection?.name];

        if (!!this.book?.volume) {
            parts.push(this.book?.volume.toString())
        }

        if (!!this.title && parts.includes(this.title) === false)
            parts.push(this.title)
        debug.debug(parts);

        return parts.filter(t => !!t).join(' - ') || 'Unknown';
    }
}

