import express from 'express';

import {Config} from '../models';
import {AppDataSource} from '../utils/app-data-source';

const configRepository = AppDataSource.getRepository(Config);
export const configRouter = express.Router();
configRouter.get('/', async function (req, res, next) {
    const config = await configRepository.find();
    return res.render('config', {config});
});
