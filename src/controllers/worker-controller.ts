import {Job} from '../models';
import debugFactory from 'debug';
import {BookController} from './book-controller';
import {CompleteEachJobDetail, CompleteJobDetail, ReloadCompleteJobDetail, UploadJobDetail} from '../models/job';

const debug = debugFactory('warene:workerController');

export const WorkerController = {
    actions: {
        complete: async (job: Job<CompleteJobDetail>) => BookController.complete(job),
        completeEach: async (job: Job<CompleteEachJobDetail>) => BookController.completeEach(job),
        'reload-complete': async (job: Job<ReloadCompleteJobDetail>) => BookController.reloadComplete(job),
        upload: async (job: Job<UploadJobDetail>) => BookController.upload(job)
    },
    sleep(ms: number) {
        debug('trace', 'sleep');
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    },
    work: async () => {
        debug('trace', 'work');

        while (true) {
            try {
                debug('trace', 'work loop');
                let job = await Job.findOne({
                    where: {
                        state: 'created'
                    },
                    order: [
                        ['priority', 'DESC'],
                        ['updatedOn', 'ASC']
                    ]
                })

                if (!!job) {
                    debug('debug', job.id);
                    job.state = 'in progress';
                    await job.save();

                    try {
                        // @ts-ignore
                        await WorkerController.actions[job.type](job);
                        debug('debug', job.details)
                        job = await job.reload()
                        job.state = 'completed';
                        await job.save();
                        debug('debug', job.id, 'done.');
                        await WorkerController.sleep(1000);
                    } catch (err) {
                        debug('debug', job.id, 'error');
                        job.state = 'error';
                        job.details.error = JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err)));
                        job.changed('details', true);
                        await job.save();
                    }
                } else {
                    await WorkerController.sleep(10 * 1000);
                }
            } catch (e) {
                debug('error', e);
            }
        }
    }
}
