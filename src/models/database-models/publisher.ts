import {BookEdition} from './book-edition';
import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class Publisher {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string

    @OneToMany(() => BookEdition, (bookEdition) => bookEdition.publisher)
    bookEditions!: BookEdition[]
}

