import {User} from '../index';
import {JobState} from '../job-state';
import {JobDetails} from '../job-details';
import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class Job<T extends JobDetails> {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    type!: string

    @Column({default: 'created'})
    state!: JobState

    @Column({default: 100})
    priority!: number

    @ManyToOne(() => User, (user) => user.jobs)
    creator!: User

    @Column({default:{}, type: 'json'})
    details!: any

    // private oldDetails!: T;

    // @BeforeUpdate()
    // static checkIfDirty<T>(instance: Job<T>) {
    //     instance.changed('details', !_.isEqual(instance.oldDetails, instance.details));
    // }

    // @AfterFind
    // static duplicateDetails<T>(instance: Job<T>, options: any) {
    //     if (instance)
    //         instance.oldDetails = _.cloneDeep(instance.details);
    // }
}

