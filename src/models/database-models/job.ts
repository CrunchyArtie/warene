import {
    AfterFind,
    BeforeUpdate,
    BelongsTo,
    Column,
    DataType,
    Default,
    ForeignKey,
    Model,
    Table,
} from 'sequelize-typescript'
import {User} from '../index';
import {DataTypes} from 'sequelize';
import _ from 'lodash';
import {JobState} from '../job-state';
import {JobDetails} from '../job-details/job-details';

@Table
export class Job<T extends JobDetails> extends Model {
    @Column
    type!: string

    @Default('created')
    @Column
    state!: JobState

    @Default(100)
    @Column
    priority!: number

    @ForeignKey(() => User)
    @Column({type: DataType.UUID})
    creatorId!: string
    @BelongsTo(() => User)
    creator!: User

    @Default({})
    @Column(DataTypes.JSON)
    details!: T

    private oldDetails!: T;

    @BeforeUpdate
    static checkIfDirty<T>(instance: Job<T>) {
        instance.changed('details', !_.isEqual(instance.oldDetails, instance.details));
    }

    @AfterFind
    static duplicateDetails<T>(instance: Job<T>, options: any) {
        if (instance)
            instance.oldDetails = _.cloneDeep(instance.details);
    }
}

