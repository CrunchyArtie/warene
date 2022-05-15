import {ParentAndChild} from './type';

export interface CompleteUrlOfSeriesJobDetails extends ParentAndChild {
    series: number
    state: 'initialize' | 'done'
}
