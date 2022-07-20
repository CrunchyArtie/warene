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
import '../utils/app-data-source'
import {Server} from 'socket.io';
import {AppDataSource} from '../utils/app-data-source';
import {In} from 'typeorm';

const debug = new DebugFactory('warene:workerController');
const jobRepository = AppDataSource.getRepository(Job);
const seriesRepository = AppDataSource.getRepository(Series);
const configRepository = AppDataSource.getRepository(Config);

class WorkerController {
    private actions: { [jobName: string]: (job: Job<any>) => Promise<JobState | void> } = {
        complete: async (job: Job<CompleteJobDetails>) => this.complete(job),
        completeUrlOfSeries: async (job: Job<CompleteUrlOfSeriesJobDetails>) => this.completeUrlOfSeries(job),
        createBooksIfNotExising: async (job: Job<CreateBooksIfNotExisingJobDetails>) => this.createBooksIfNotExising(job),
        refreshBook: async (job: Job<RefreshBookJobDetails>) => this.refreshBook(job),
        upload: async (job: Job<UploadJobDetail>) => this.upload(job)
    }

    private sleep(ms: number) {
        debug.trace('sleep');
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    public async work() {
        debug.trace('work')

        const io = new Server();
        const clients: any[] = [];

        io.on('connection', (socket) => {
            clients.push(socket);

            debug.debug('to server: ping ?')
            socket.emit('ping');

            socket.on('pong', (...args) => {
                debug.debug('from server: pong')
            })
        });


        let ioPort = 3001;
        if (!!process.env.WORKER_SOCKET_PORT && Number.isInteger(process.env.WORKER_SOCKET_PORT)) {
            ioPort = +process.env.WORKER_SOCKET_PORT
        }
        io.listen(ioPort || 3001);

        debug.trace('work');
        let loopIndex = 0;
        while (true) {
            if (!(await this.shouldRun())) {
                debug.debug('worker is not working')
                loopIndex = 0;
                await this.sleep(1500)
                continue;
            }

            try {
                debug.trace('work loop');
                let job = await jobRepository.findOne({
                    where: [
                        {state: JobState.created},
                        {state: JobState.resume}
                    ],
                    order: {
                        priority: 'ASC',
                        id: 'ASC'
                    },
                    relations: ['creator']
                })

                if (!!job) {
                    debug.info(job.type, job.id, 'started.');
                    loopIndex++;
                    job.state = JobState['in progress'];
                    await jobRepository.save(job);

                    try {
                        // @ts-ignore
                        const state = await this.actions[job.type](job);
                        job = (await jobRepository.findOneBy({id: job.id}))!
                        job.state = state || JobState.completed;
                        job = await jobRepository.save(job);
                        // @ts-ignore
                        clients.forEach(c => c.emit('job-done', job?.toJSON()))
                        debug.debug(job.id, 'done.');
                        debug.success(job.type, job.id, 'done with success.');
                    } catch (err) {
                        if (JSON.stringify(err).toLowerCase().includes('timeout')) {
                            loopIndex = -1;
                        }
                        debug.debug(job.id, 'error');
                        job.state = JobState.error;
                        job.details.error = JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err)));
                        debug.error(job.details.error)
                        await jobRepository.save(job);
                        debug.info(job.type, job.id, 'done with errors.');

                        const parentId = (<Job<ChildJobDetails>>job).details.parentJobId
                        if (!!parentId) {
                            const parentJob = await jobRepository.findOneBy({id: parentId});
                            if (parentJob) {
                                parentJob.state = JobState.error;
                                parentJob.details.error = 'In error by child : ' + job.id;
                                await jobRepository.save(parentJob);
                            }
                        }

                        const childrenIds = (<Job<ParentJobDetails>>job).details.childrenJobIds || [];
                        for (let childId of childrenIds) {
                            const child = await jobRepository.findOneBy({id: childId});
                            if (child) {
                                child.state = JobState.error;
                                child.details.error = 'In error by parent : ' + job.id;
                                await jobRepository.save(child);
                            }
                        }
                    }

                    if (loopIndex === -1 || loopIndex > 50) {
                        debug.info('50 jobs, we go to sleep 2 minutes')
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
        debug.trace('completeUrlOfSeries');
        debug.debug(job.id);

        if (job.details.state === 'initialize') {
            const result = await this.initializeCompleteUrlOfSeries(job)
            job.details.state = 'done';
            await jobRepository.save(job);
            return result;
        } else if (job.details.state === 'done') {
            return await this.setParentJobAsDoneIfNeeded(job)
        }

        throw new Error('CompleteUrlOfSeriesJob state "' + job.details.state + '" not implemented')
    }

    public async createBooksIfNotExising(job: Job<CreateBooksIfNotExisingJobDetails>) {
        debug.trace('createBooksIfNotExising');
        debug.debug(job.id);
        debug.debug(job.details.series);
        const series = await seriesRepository.findOne({where: {id: job.details.series}, relations: ['books', 'books.bookEditions']})
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
            await AppDataSource.transaction(async (transactionalEntityManager) => {
                const bookRepository = await transactionalEntityManager.getRepository(Book)
                const bookEditionRepository = await transactionalEntityManager.getRepository(BookEdition)
                let book = await bookRepository.findOne({
                    where: {volume, series: {id: series.id}},
                    relations: {series: true}
                })
                if (!book) {
                    book = new Book();
                    await transactionalEntityManager.save(book);
                }
                debug.debug('book: ', book.id)
                const bookEditions = await bookEditionRepository.find({
                    where: {book: {id: book.id}},
                    relations: {book: true}
                })
                debug.debug('bookEditions ', bookEditions.length);
                let bookEdition = bookEditions.find(be => +be.europeanArticleNumber === +europeanArticleNumber);
                if (!bookEdition) {
                    debug.debug('create :', europeanArticleNumber);
                    bookEdition = new BookEdition();
                    bookEdition.europeanArticleNumber = europeanArticleNumber;

                    book.bookEditions.push(bookEdition);
                    await transactionalEntityManager.save(bookEdition);
                    await transactionalEntityManager.save(book);
                }

                if (!bookEdition) {
                    throw new Error('No bookEdition found for this book');
                }

                bookEdition.link = bookUrl;
                await transactionalEntityManager.save(bookEdition);
                series.books.push(book)
                await transactionalEntityManager.save(series);
            })
        }

        const parentJob = await jobRepository.findOneBy({id: job.details.parentJobId});
        if (parentJob) {
            parentJob.state = JobState.resume
            await jobRepository.save(parentJob);
        } else {
            throw new Error('Must have a parent job');
        }
    }

    private async setParentJobAsDoneIfNeeded(job: Job<ChildJobDetails>) {
        debug.trace('setParentJobAsDoneIfNeeded')
        let parentJob = await jobRepository.findOneBy({id: job.details.parentJobId});
        if (parentJob === null) {
            throw new Error('Parent job not found');
        } else {
            debug.debug('Parent job found', parentJob.id);
            const childrenIds = (<Job<ParentJobDetails>>parentJob).details.childrenJobIds;
            debug.debug('Children ids', childrenIds);
            const count = await jobRepository.count({
                where: {
                    id: In(childrenIds),
                    state: JobState.completed
                }
            });
            debug.debug('Children count: ', count);
            // on se compte pas soi meme
            if ((childrenIds.length - 1) === count) {
                parentJob.state = JobState.resume;
                await jobRepository.save(parentJob)
            }
        }
    }

    private async complete(job: Job<CompleteJobDetails>) {
        debug.trace('complete')
        switch (job.details.state) {
            case 'initialize': {
                await this.initializeCompleteJob(job);
                job.details.state = 'completeUrlOfSeries'
                await jobRepository.save(job);
                return JobState.waiting
            }
            case 'completeUrlOfSeries': {
                await this.refreshAllBooksOfJob(job);
                job.details.state = 'done'
                await jobRepository.save(job);
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
        debug.trace('initializeCompleteJob')
        debug.debug(job.details)
        const user = job.creator
        if (!user) {
            throw new Error('User not found');
        }

        debug.debug('job?.details?.series', job.details.series)
        debug.debug('!job?.details?.series', !job.details.series)
        debug.debug('job?.details?.series?.length == 0', job?.details?.series?.length == 0)
        debug.debug('!job?.details?.series || job?.details?.series?.length == 0', !job?.details?.series || job?.details?.series?.length == 0)

        if (!job.details.series || job.details.series.length == 0) {
            const seriesToComplete = await BookController.getSeriesOfUser(user);
            job.details.series = seriesToComplete.map(s => s.id);
        }

        job.details.childrenJobIds = job.details.childrenJobIds || [];

        for (const seriesId of job.details.series) {
            const childJob = new Job();
            childJob.type = 'completeUrlOfSeries';
            childJob.priority = 110;
            childJob.creator = job.creator;
            childJob.details = {
                parentJobId: job.id,
                state: 'initialize',
                series: seriesId
            }
            await jobRepository.save(childJob);
            job.details.childrenJobIds.push(childJob.id);
        }
        await jobRepository.save(job);
    }

    private async initializeCompleteUrlOfSeries(job: Job<CompleteUrlOfSeriesJobDetails>) {
        debug.trace('initializeCompleteUrlOfSeries');
        debug.debug(job.details.series);
        const series = await seriesRepository.findOne({where: {id: job.details.series}, relations: ['books', 'books.bookEditions']});
        if (!series) {
            throw new Error('No series found for this job')
        }
        series.link = await BrowserController.completeUrlOfSeries(series);
        await seriesRepository.save(series);

        const childJob = new Job()

        childJob.type = 'createBooksIfNotExising';
        childJob.priority = 90;
        childJob.creator = job.creator;
        childJob.details = {
            state: 'initialize',
            series: series.id,
            parentJobId: job.id
        }
        job.details.childrenJobIds = job.details.childrenJobIds || [];
        job.details.childrenJobIds.push(childJob.id);

        await jobRepository.save(job);
        await jobRepository.save(childJob);
        return JobState.waiting;
    }

    private async refreshBook(job: Job<RefreshBookJobDetails>) {
        debug.trace('refreshBook');
        debug.debug(job.details.book);
        await BrowserController.refreshBook(job.details.book.toString())
        await this.setParentJobAsDoneIfNeeded(job);
    }

    private async refreshAllBooksOfJob(job: Job<CompleteJobDetails>) {
        debug.trace('refreshAllBooksOfJob')
        debug.debug(job.id);
        const user = job.creator;
        if (user === null) {
            throw new Error('user not found');
        }
        debug.debug('job.details.series', job.details.series)
        const seriesList = await seriesRepository.findBy({id: In(job.details.series)})
        const books = await BookController.getBooksFromSeries(seriesList)
        debug.debug('books', books);
        job.details.childrenJobIds = job.details.childrenJobIds || [];

        for (const book of books) {
            const childJob = new Job();

            childJob.type = 'refreshBook';
            childJob.priority = 80;
            childJob.creator = job.creator;
            childJob.details = {
                book: book.edition.europeanArticleNumber,
                parentJobId: job.id
            }
            await jobRepository.save(childJob);
            job.details.childrenJobIds.push(childJob.id);
        }
        await jobRepository.save(job);
    }

    private async shouldRun() {
        debug.trace('shouldRun')
        return (await configRepository.findOneBy({name: 'worker-is-running'}))?.value === 'true' || false
    }

    public async refreshAllSeries(user: User) {
        debug.trace('refreshAllSeries')
        const job = new Job()
        job.type = 'complete';
        job.creator = user;
        job.details = {
            state: 'initialize'
        };
        return await jobRepository.save(job);
    }

    public async refreshSeries(user: User, id: number) {
        debug.trace('refreshAllSeries')
        debug.debug(id)

        const job = new Job();

        job.type = 'complete';
        job.creator = user;
        job.details = {
            series: [id],
            state: 'initialize'
        }

        return await jobRepository.save(job);
    }
}

export default new WorkerController();
