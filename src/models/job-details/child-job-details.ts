import {JobDetails} from './job-details';

export interface ChildJobDetails extends JobDetails {
    parentJobId: string;
}
