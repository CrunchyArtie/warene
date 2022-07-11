import {
    Book,
    BookEdition,
    ChildJobDetails,
    CompleteJobDetails,
    CompleteUrlOfSeriesJobDetails,
    Config,
    CreateBooksIfNotExisingJobDetails,
    Job,
    JobState,
    ParentJobDetails,
    RefreshBookJobDetails,
    Series,
    UploadJobDetail,
    User
} from '../models';
import DebugFactory from '../utils/debug-factory';
import BookController from './book-controller';
import BrowserController from './browser-controller';
import '../utils/sequelize'
import {Server} from 'socket.io';
import sequelize from '../utils/sequelize';

const debug = new DebugFactory('warene:workerController');

class WorkerController {
    private actions: { [jobName: string]: (job: Job<any>) => Promise<JobState | void> } = {
        complete: async (job: Job<CompleteJobDetails>) => this.complete(job),
        completeUrlOfSeries: async (job: Job<CompleteUrlOfSeriesJobDetails>) => this.completeUrlOfSeries(job),
        createBooksIfNotExising: async (job: Job<CreateBooksIfNotExisingJobDetails>) => this.createBooksIfNotExising(job),
        refreshBook: async (job: Job<RefreshBookJobDetails>) => this.refreshBook(job),
        upload: async (job: Job<UploadJobDetail>) => this.upload(job)
    }

    private sleep(ms: number) {
        debug.trace( 'sleep');
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    public async work() {
        debug.trace( 'work')

        const io = new Server();
        const clients: any[] = [];

        io.on('connection', (socket) => {
            clients.push(socket);

            debug.debug( 'to server: ping ?')
            socket.emit('ping');

            socket.on('pong', (...args) => {
                debug.debug( 'from server: pong')
            })
        });


        let ioPort = 3001;
        if (!!process.env.WORKER_SOCKET_PORT && Number.isInteger(process.env.WORKER_SOCKET_PORT)) {
            ioPort = +process.env.WORKER_SOCKET_PORT
        }
        io.listen(ioPort || 3001);

        debug.trace( 'work');
        let loopIndex = 0;
        while (true) {
            if (!(await this.shouldRun())) {
                debug.debug( 'worker is not working')
                loopIndex = 0;
                await this.sleep(1500)
                continue;
            }

            try {
                debug.trace( 'work loop');
                let job = await Job.findOne({
                    where: {
                        state: ['created', 'resume']
                    },
                    order: [
                        ['priority', 'ASC'],
                        ['id', 'ASC']
                    ]
                })

                if (!!job) {
                    debug.info( job.type, job.id, 'started.');
                    loopIndex++;
                    job.state = JobState['in progress'];
                    await job.save();

                    try {
                        // @ts-ignore
                        const state = await this.actions[job.type](job);
                        job = await job.reload()
                        job.state = state || JobState.completed;
                        job = await job.save();
                        // @ts-ignore
                        clients.forEach(c => c.emit('job-done', job?.toJSON()))
                        debug.debug( job.id, 'done.');
                        debug.success( job.type, job.id, 'done with success.');
                    } catch (err) {
                        if (JSON.stringify(err).toLowerCase().includes('timeout')) {
                            loopIndex = -1;
                        }
                        debug.debug( job.id, 'error');
                        job.state = JobState.error;
                        job.details.error = JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err)));
                        debug.error(job.details.error)
                        await job.save();
                        debug.info( job.type, job.id, 'done with errors.');

                        const parentId = (<Job<ChildJobDetails>>job).details.parentJobId
                        if (!!parentId) {
                            const parentJob = await Job.findByPk(parentId);
                            if (parentJob) {
                                parentJob.state = JobState.error;
                                parentJob.details.error = 'In error by child : ' + job.id;
                                await parentJob.save();
                            }
                        }

                        const childrenIds = (<Job<ParentJobDetails>>job).details.childrenJobIds || [];
                        for (let childId of childrenIds) {
                            const child = await Job.findByPk(childId);
                            if (child) {
                                child.state = JobState.error;
                                child.details.error = 'In error by parent : ' + job.id;
                                await child.save();
                            }
                        }
                    }

                    if (loopIndex === -1 || loopIndex > 50) {
                        debug.info( '50 jobs, we go to sleep 2 minutes')
                        loopIndex = 0;
                        await this.sleep(2 * 60 * 1000)
                    }
                } else {
                    await this.sleep(10 * 1000);
                }
            } catch (e) {
                debug.error(e);
            }
        }
    }

    public async completeUrlOfSeries(job: Job<CompleteUrlOfSeriesJobDetails>) {
        debug.trace( 'completeUrlOfSeries');
        debug.debug( job.id);

        if (job.details.state === 'initialize') {
            const result = await this.initializeCompleteUrlOfSeries(job)
            job.details.state = 'done';
            await job.save();
            return result;
        } else if (job.details.state === 'done') {
            return await this.setParentJobAsDoneIfNeeded(job)
        }

        throw new Error('CompleteUrlOfSeriesJob state "' + job.details.state + '" not implemented')
    }

    public async createBooksIfNotExising(job: Job<CreateBooksIfNotExisingJobDetails>) {
        debug.trace( 'createBooksIfNotExising');
        debug.debug( job.id);
        debug.debug( job.details.series);
        const series = await Series.findByPk(job.details.series)
        if (!series) {
            throw new Error('No series found for this job')
        }
        const booksUrls = (await BrowserController.getBookLinksInSeriesPage(series.link)).reverse() // reverse to get the latest first (the first book is the latest);
        debug.debug('booksUrls length: ', booksUrls.length);
        const possibleEan = (series.books || []).map(b => b.edition.europeanArticleNumber);

        const bestBooksUrls = [];
        // prefer editions in collection
        for (const bookUrl of booksUrls) {
            const bestUrlFound = await BrowserController.getBookOwnedEditionUrl(bookUrl, possibleEan);
            bestBooksUrls.push(bestUrlFound || bookUrl)
        }
        debug.debug('bestBooksUrls length: ', bestBooksUrls.length);
        debug.debug('bestBooksUrls: ', bestBooksUrls);

        for (const bookUrl of bestBooksUrls) {
            debug.debug(bookUrl, 'bookUrl')
            const europeanArticleNumber = await BrowserController.getBookEuropeanArticleNumberInBookPage(bookUrl);
            debug.debug('europeanArticleNumber: ', europeanArticleNumber);
            const volume = await BrowserController.getVolumeInBookPage(bookUrl);
            debug.debug('volume: ', volume);
            const transaction = await sequelize.transaction();
            try {
                const [book] = await Book.findOrCreate({where: {volume}, include: [{model: Series, where: {id: series.id}, required: true}]})
                debug.debug('book: ', book.toJSON())
                const bookEditions = await BookEdition.findAll({where: {bookId: book.id}, include: [Book]})
                debug.debug('bookEditions ', bookEditions.length);
                let bookEdition = bookEditions.find(be => +be.europeanArticleNumber === +europeanArticleNumber);
                if (!bookEdition) {
                    debug.debug('create :', europeanArticleNumber);
                    bookEdition = await BookEdition.create({europeanArticleNumber});
                    await book.$add('bookEditions', bookEdition);
                    await book.save();
                }

                if(!bookEdition) {
                    throw new Error('No bookEdition found for this book');
                }

                bookEdition.link = bookUrl;
                await bookEdition.save();
                await series.$add('books', book)
                await series.save();
                await transaction.commit();
            } catch (e) {
                await transaction.rollback();
                throw e;
            }
        }

        const parentJob = await Job.findByPk(job.details.parentJobId);
        if (parentJob) {
            parentJob.state = JobState.resume
            await parentJob.save();
        } else {
            throw new Error('Must have a parent job');
        }
    }

    private async setParentJobAsDoneIfNeeded(job: Job<ChildJobDetails>) {
        debug.trace( 'setParentJobAsDoneIfNeeded')
        let parentJob = await Job.findByPk(job.details.parentJobId);
        if (parentJob === null) {
            throw new Error('Parent job not found');
        } else {
            const childrenIds = (<Job<ParentJobDetails>>parentJob).details.childrenJobIds;
            const count = await Job.count({
                where: {
                    id: childrenIds,
                    state: JobState.completed
                }
            });
            // on se compte pas soi meme
            if ((childrenIds.length - 1) === count) {
                parentJob.state = JobState.resume;
                await parentJob.save()
            }
        }
    }

    private async complete(job: Job<CompleteJobDetails>) {
        debug.trace( 'complete')
        switch (job.details.state) {
            case 'initialize': {
                await this.initializeCompleteJob(job);
                job.details.state = 'completeUrlOfSeries'
                await job.save();
                return JobState.waiting
            }
            case 'completeUrlOfSeries': {
                await this.refreshAllBooksOfJob(job);
                job.details.state = 'done'
                await job.save();
                return;
            }
            case 'done': {
                return;
            }
        }

        throw new Error(`state: "${job.details.state}" not implemented`);
    }

    private async upload(job: Job<UploadJobDetail>) {
        return await BookController.upload(job)
    }

    private async initializeCompleteJob(job: Job<CompleteJobDetails>) {
        debug.trace( 'initializeCompleteJob')
        debug.debug( job.details)
        const user = await User.findOne({where: {id: job.creatorId}})
        if (!user) {
            throw new Error('User not found');
        }

        debug.debug( 'job?.details?.series', job.details.series)
        debug.debug( '!job?.details?.series', !job.details.series)
        debug.debug( 'job?.details?.series?.length == 0', job?.details?.series?.length == 0)
        debug.debug( '!job?.details?.series || job?.details?.series?.length == 0', !job?.details?.series || job?.details?.series?.length == 0)

        if(!job.details.series || job.details.series.length == 0) {
            const seriesToComplete = await BookController.getSeriesOfUser(user, []);
            job.details.series = seriesToComplete.map(s => s.id);
        }

        job.details.childrenJobIds = job.details.childrenJobIds || [];

        for (const seriesId of job.details.series) {
            const childJob = await Job.create({
                type: 'completeUrlOfSeries',
                priority: 110,
                creatorId: job.creatorId,
                details: {
                    parentJobId: job.id,
                    state: 'initialize',
                    series: seriesId
                }
            })
            job.details.childrenJobIds.push(childJob.id);
        }
        await job.save();
    }

    private async initializeCompleteUrlOfSeries(job: Job<CompleteUrlOfSeriesJobDetails>) {
        debug.trace( 'initializeCompleteUrlOfSeries');
        debug.debug( job.details.series);
        const series = await Series.findByPk(job.details.series, {
            include: [{all: true, nested: true}]
        })
        if (!series) {
            throw new Error('No series found for this job')
        }
        series.link = await BrowserController.completeUrlOfSeries(series);
        await series.save();

        const childJob = await Job.create({
            type: 'createBooksIfNotExising',
            priority: 90,
            creatorId: job.creatorId,
            details: {
                state: 'initialize',
                series: series.id,
                parentJobId: job.id
            }
        })

        job.details.childrenJobIds = job.details.childrenJobIds || [];
        job.details.childrenJobIds.push(childJob.id);
        await job.save();
        return JobState.waiting;
    }

    private async refreshBook(job: Job<RefreshBookJobDetails>) {
        debug.trace( 'refreshBook');
        debug.debug( job.details.book);
        await BrowserController.refreshBook(job.details.book.toString())
        await this.setParentJobAsDoneIfNeeded(job);
    }

    private async refreshAllBooksOfJob(job: Job<CompleteJobDetails>) {
        debug.trace( 'refreshAllBooksOfJob')
        debug.debug( job.id);
        const user = await User.findByPk(job.creatorId);
        if (user === null) {
            throw new Error('user not found');
        }
        const seriesList = await Series.findAll({where: {id: job.details.series}})
        const books = await BookController.getBooksFromSeries(seriesList, [BookEdition])

        job.details.childrenJobIds = job.details.childrenJobIds || [];

        for (const book of books) {
            const childJob = await Job.create({
                type: 'refreshBook',
                priority: 80,
                creatorId: job.creatorId,
                details: {
                    book: book.edition.europeanArticleNumber,
                    parentJobId: job.id
                }
            })
            job.details.childrenJobIds.push(childJob.id);
        }
        await job.save();
    }

    private async shouldRun() {
        debug.trace('shouldRun')
        return (await Config.findOne({where: {name: 'worker-is-running'}}))?.value === 'true' || false
    }

    public async refreshAllSeries(user: User) {
        debug.trace( 'refreshAllSeries')
        return await Job.create({
            type: 'complete',
            creatorId: user.id,
            details: {
                state: 'initialize'
            }
        });
    }

    public async refreshSeries(user: User, id: number) {
        debug.trace( 'refreshAllSeries')
        debug.debug( id)

        return await Job.create({
            type: 'complete',
            creatorId: user.id,
            details: {
                series: [id],
                state: 'initialize'
            }
        });
    }
}

export default new WorkerController();
