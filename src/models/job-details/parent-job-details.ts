import {JobDetails} from './job-details';

export interface ParentJobDetails extends JobDetails {
    childrenJobIds: string[];
}
