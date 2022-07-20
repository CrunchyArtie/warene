import {Book, Publisher, User} from '../index';
import {Column, Entity, ManyToMany, ManyToOne, PrimaryColumn} from 'typeorm';
import DebugFactory from '../../utils/debug-factory';

const debug = new DebugFactory('warene:BookEdition');

@Entity()
export class BookEdition {
    @PrimaryColumn('bigint')
    europeanArticleNumber!: number

    @Column({nullable: true})
    title?: string

    @Column()
    publishDate!: Date

    @Column("real")
    price!: number

    @Column()
    givenAddDate!: Date

    @Column()
    inCollection!: boolean

    @Column()
    isRead!: boolean

    @Column()
    isAutographed!: boolean

    @Column()
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

        return parts.filter(t => !!t).join(' - ')
    }
}

