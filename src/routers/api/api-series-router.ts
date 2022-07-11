import express from 'express';
import DebugFactory from '../../utils/debug-factory';
import {WorkerController} from '../../controllers';

const debug = new DebugFactory('warene:seriesRouter');

export const apiSeriesRouter = express.Router();

apiSeriesRouter.post('/complete', async function (req, res, next) {
    debug.trace( 'get', '/complete')
    debug.debug( req.body.seriesId)

    if (!!req.body.seriesId) {
        await WorkerController.refreshSeries(req.session.user!, +req.body.seriesId);
    } else {
        throw new Error('No series id provided');
    }

    res.send('OK');
});

