import {Book} from './book';
import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class Category {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string

    @OneToMany(() => Book, (book) => book.category)
    books!: Book[]
}


