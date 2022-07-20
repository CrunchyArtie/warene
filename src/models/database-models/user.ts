import {Job} from './job';
import {BookEdition} from './book-edition';
import {Column, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({unique: true})
    username!: string

    @Column()
    password!: string

    @ManyToMany(() => BookEdition, (bookEdition) => bookEdition.owners)
    @JoinTable()
    bookEditions!: BookEdition[]

    @OneToMany(() => Job, (job) => job.creator)
    jobs!: Job<any>[]
}
