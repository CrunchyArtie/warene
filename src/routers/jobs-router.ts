import express from 'express';
import debugFactory from 'debug';
import {User, Job} from '../models';

const debug = debugFactory('warene:jobRouter');

export const jobsRouter = express.Router();

jobsRouter.get('/', async function (req, res, next) {
    debug('trace', 'get', '/')
    const user = await User.findOne({
        where: {id: req.session.user!.id},
        include: [Job]
    })
    res.render('jobs', {
        title: 'Processus',
        jobs: user?.jobs.sort((a, b) => b.updatedOn.getTime() - a.updatedOn.getTime())
    });
});

// jobsRouter.get('/reload', async function (req, res, next) {
//     debug('trace', 'get', '/reload')
//     const job = await Job.findOne<Job<CompleteJobDetail>>({
//         where: {
//             type: 'complete',
//             state: 'completed'
//         },
//         order: [['updatedOn', 'DESC']]
//     })
//     debug('debug', job?.id)
//     if (!!job) {
//         const childIds = job.details.childrenJobIds;
//         debug('debug', childIds)
//         const children = await Job.findAll<Job<CompleteEachJobDetail>>({
//             where: {state: 'error', id: childIds}
//         })
//         debug('debug', children.length);
//         const data: Partial<Job<ReloadCompleteJobDetail>> = {
//             type : 'reload-complete',
//             state : 'created',
//             creatorId : req.session.user?.id,
//             priority : 100,
//             details : {
//                 childrenJobIds: children.map(c => c.id),
//                 parentJobId: job.id,
//             }
//         }
//         try {
//             await Job.create<Job<CompleteJobDetail>>(data)
//         } catch (err) {
//             res.redirect('/jobs');
//             throw err
//         }
//     }
// });

jobsRouter.get('/clean', async function (req, res, next) {
    debug('trace', 'get', '/clean')
    await Job.destroy({
        where: {state: ['completed', 'error']}
    })

    res.redirect('/jobs');
});

jobsRouter.get('/force-error', async function (req, res, next) {
    await Job.update({
        state: 'error'
    }, {
        where: {state: 'in progress'}
    })

    res.redirect('/jobs')
});
