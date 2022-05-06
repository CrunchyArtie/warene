import {
    AllowNull,
    BelongsTo,
    BelongsToMany,
    Column,
    CreatedAt, Default,
    ForeignKey,
    Model, PrimaryKey,
    Table, Unique,
    UpdatedAt
} from 'sequelize-typescript'
import {Author, BookAuthor, BookUser, Category, Collection, Publisher, Series, Type, User} from './index';
import {DataTypes} from 'sequelize';

export type JobState = 'in progress' | 'created' | 'resume' | 'error' | 'waiting' | 'completed'

export interface UploadJobDetail extends JobDetails {
    login: string;
    password: string;
}

export interface CompleteEachJobDetail extends ChildJobDetails {
    book: number
}

export interface CompleteJobDetail extends ParentJobDetails {
    book: number
}
type ParentAndChildJobDetails = ParentJobDetails & ChildJobDetails;
export interface ReloadCompleteJobDetail extends ParentAndChildJobDetails  {
}

export interface ChildJobDetails extends JobDetails {
    parentJobId: string;
}

export interface ParentJobDetails extends JobDetails {
    childrenJobIds: string[];
}

export interface JobDetails {
    error?: any
}

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
    @Column
    creatorId!: string
    @BelongsTo(() => User)
    creator!: User

    @Default({})
    @Column(DataTypes.JSON)
    details!: T

    @CreatedAt
    creationDate!: Date;

    @UpdatedAt
    updatedOn!: Date;
}

