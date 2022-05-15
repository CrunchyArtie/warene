import {JobDetails} from './job-details';

export interface UploadJobDetail extends JobDetails {
    login: string;
    password: string;
}
