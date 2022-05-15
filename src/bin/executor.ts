import * as dotenv from 'dotenv';
dotenv.config();

import debugFactory from 'debug';
import {BrowserController} from '../controllers';
const debug = debugFactory('warene:executor');

debug('info', 'EXECUTOR !');

BrowserController.getBookOwnedEditionUrl('/planetes-tome-1/album/ccAgKV1LRE/q83by91xEqBHcY', [9782809450798]).then((result) => {
    debug('info', result);
}).catch((err) => {
    console.error(err);
})
