import express from 'express';
import DebugFactory from '../utils/debug-factory';
import {User, Job} from '../models';

const debug = new DebugFactory('warene:jobRouter');

export const jobsRouter = express.Router();

jobsRouter.get('/', async function (req, res, next) {
    debug.trace( 'get', '/')
    const user = await User.findOne({
        where: {id: req.session.user!.id},
        include: [{all: true, nested: true}]
    })
    res.render('jobs', {
        title: 'Processus',
        jobs: user?.jobs//.sort((a, b) => b.updatedOn.getTime() - a.updatedOn.getTime())
    });
});

jobsRouter.get('/clean', async function (req, res, next) {
    debug.trace( 'get', '/clean')
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
