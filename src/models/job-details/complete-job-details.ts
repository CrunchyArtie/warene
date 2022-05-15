import {ParentJobDetails} from './parent-job-details';

export interface CompleteJobDetails extends ParentJobDetails {
    series: number[]
    books: number[]
    state: 'initialize' | 'completeUrlOfSeries' | 'refreshAllBooksOfUser' | 'done'
}
