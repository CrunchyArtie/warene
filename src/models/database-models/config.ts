import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class Config {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column()
    value!: string
}
