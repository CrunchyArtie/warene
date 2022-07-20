import {Book} from './book';
import {Column, Entity, PrimaryGeneratedColumn, ManyToMany, JoinTable} from 'typeorm';

@Entity()
export class Author {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @ManyToMany(() => Book, (book) => book.authors)
    @JoinTable()
    books!: Book[]
}
