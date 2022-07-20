import {Book} from './book';
import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class Collection {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string

    @OneToMany(() => Book, (book) => book.collection)
    books!: Book[]
}

