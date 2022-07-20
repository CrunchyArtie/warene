import {Book} from './book';
import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class Type {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string

    @OneToMany(() => Book, (book) => book.type)
    books!: Book[]
}
