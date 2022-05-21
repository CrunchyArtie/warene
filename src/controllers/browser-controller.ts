import {chromium} from 'playwright-core';
import {ElementHandle, Page} from 'playwright';
import {Book, RawBook, Series} from '../models';
import BookController from './book-controller';
import DebugFactory from '../utils/debug-factory';
import {Readable} from 'stream';
import csv from 'csv-parser';
import moment from 'moment';
import 'moment/locale/fr'
moment.locale('fr')

const debug = new DebugFactory('warene:BrowserController');
class BrowserController {
    private async usingBrowser<T> (action: (page: Page) => T): Promise<T> {
        const headless = !!process.env.HEADLESS ? process.env.HEADLESS === 'true' : true;
        const browser = await chromium.launch({headless});
        const result = await action(await browser.newPage())
        await browser.close();
        return result;
    }

    public async refreshBook (ean: string) {
        debug.trace( 'refreshBook')
        debug.debug( ean)
        const theFirstBookInSecondColumnSelector = `#root > div.bubble-body > header > div > nav > div.collapse.navbar-collapse > div > div > div > div.home-search-bar.rounded-medium.input-group.bg-black.align-items-center.over-global-overlay > div.shadow.p-3.px-4.search-result-zone > div > div:nth-child(3) > div.row > a:nth-child(1)`;
        const sameBookButDifferentVersionListSelector = '#root > div.bubble-body > div.bb-background-light-grey > div:nth-child(1) > div > div.row.px-sm-3.mt-n3 > div.col-lg-8.my-3.d-flex.flex-column.justify-content-between > div.row.px-3.my-3 > div > div.row.py-2.px-md-3.d-flex.flex-row.flex-wrap.justify-content-start > div > div > div.col-9.d-flex.flex-column > div.text-muted'
        const book = await Book.findByPk(ean);
        return await this.usingBrowser(async (page) => {
            try {

                await Promise.all([
                    page.waitForNavigation(),
                    page.goto(this.getUrl())
                ]);

                await page.fill('nav input', ean)
                await Promise.all([
                    page.waitForNavigation(),
                    page.locator(theFirstBookInSecondColumnSelector).click()
                ]);

                await Promise.all([
                    page.waitForNavigation(),
                    page.locator(sameBookButDifferentVersionListSelector, {
                        hasText: ean
                    }).click()
                ])

                const book = await this.processBookPage(page);
                debug.debug( book.prettyTitle, 'done')
        } catch (e: any) {
            debug.error(ean, e)
            throw e
        }
    })

    }

    public async processBookPage (page: Page) {
        debug.trace( 'processBookPage')
        debug.debug( page.url())
        const authorsSelector = '#root > div.bubble-body > div.bb-background-light-grey > div:nth-child(2) > div > div.col-md-6.pt-4.pt-md-0 > table:nth-child(4) > tbody > tr:nth-child(1) > td:nth-child(2) > a';
        const titleSelector = '#root > div.bubble-body > div.bb-background-light-grey > div:nth-child(1) > div > div.row.px-sm-3.mt-n3 > div.col-lg-8.my-3.d-flex.flex-column.justify-content-between > div.d-none.d-md-flex.justify-content-between.align-items-start.px-1 > div > h1';
        const price = '#root > div.bubble-body > div.bb-background-light-grey > div:nth-child(1) > div > div.row.px-sm-3.mt-n3 > div.col-lg-8.my-3.d-flex.flex-column.justify-content-between > div.bb-large-text-size.font-weight-bold.font-weight-md-normal.my-2.px-1'
        const category = '#root > div.bubble-body > div.bb-background-light-grey > div:nth-child(2) > div > div.col-md-6.pt-4.pt-md-0 > table:nth-child(2) > tbody > tr:nth-child(1) > td:nth-child(2) > a'
        const type = '#root > div.bubble-body > div.bb-background-light-grey > div:nth-child(2) > div > div.col-md-6.pt-4.pt-md-0 > table:nth-child(2) > tbody > tr:nth-child(3) > td:nth-child(2)'
        const collection = '#root > div.bubble-body > div.bb-background-light-grey > div:nth-child(2) > div > div.col-md-6.pt-4.pt-md-0 > table:nth-child(2) > tbody > tr:nth-child(4) > td:nth-child(2)'
        const publisherSelector = '#root > div.bubble-body > div.bb-background-light-grey > div:nth-child(2) > div > div.col-md-6.pt-4.pt-md-0 > table:nth-child(4) > tbody > tr:nth-child(2) > td:nth-child(2)'
        const volumeSelector = '#root > div.bubble-body > div.bb-background-light-grey > div:nth-child(2) > div > div.col-md-6.pt-4.pt-md-0 > table:nth-child(4) > tbody > tr:nth-child(3) > td:nth-child(2)'
        const publishDateSelector = '#root > div.bubble-body > div.bb-background-light-grey > div:nth-child(2) > div > div.col-md-6.pt-4.pt-md-0 > table:nth-child(4) > tbody > tr:nth-child(4) > td:nth-child(2)'
        const eanSelector = '#root > div.bubble-body > div.bb-background-light-grey > div:nth-child(2) > div > div.col-md-6.pt-4.pt-md-0 > table:nth-child(4) > tbody > tr:nth-child(5) > td:nth-child(2)'
        const pageCountSelector = '#root > div.bubble-body > div.bb-background-light-grey > div:nth-child(2) > div > div.col-md-6.pt-4.pt-md-0 > table:nth-child(4) > tbody > tr:nth-child(6) > td:nth-child(2)'

        const get = async (selector: string) => {
            try {
                return await page.locator(selector).innerText({timeout: 200});
            } catch (e) {
                return ''
            }
        }

        async function getAuthors() {
            const authorsHtml = await page.$$(authorsSelector)
            const authors = await Promise.all(authorsHtml.map(async (author) =>
                await author.innerText()
            ))
            return authors.join(',')
        }

        let ean = await get(eanSelector)
        while (ean === undefined || ean === '') {
            await page.waitForTimeout(200);
            ean = await get(eanSelector)
        }
        debug.debug( 'ean', ean);
        const promises = [
            getAuthors(),
            ...[titleSelector,
                price,
                category,
                type,
                collection,
                publisherSelector,
                volumeSelector,
                publishDateSelector,
                eanSelector,
                pageCountSelector].map(s => get(s)) // Attention l'ordre est important
        ]

        const data = await Promise.all(promises);

        const rawBook = {
            Auteurs: data[0],
            'Titre de l\'album': data[1],
            Prix: data[2],
            Catégory: data[3],
            Type: data[4],
            Collection: data[5],
            Editeur: data[6],
            Tome: data[7],
            'Date de publication': moment(data[8], 'll').toISOString(),
            EAN: data[9],
            pageCount: +(data[10])
        }

        return await BookController.toBook(rawBook)
    }

    public async completeUrlOfSeries (series: Series): Promise<string> {
        debug.trace( 'getUrlOfSeries')
        debug.debug( series.name)

        const searchBarSelector = 'nav input';
        const firstSeriesInFirstColumnSelector = `#root > div.bubble-body > header > div > nav > div.collapse.navbar-collapse > div > div > div > div.home-search-bar.rounded-medium.input-group.bg-black.align-items-center.over-global-overlay > div.shadow.p-3.px-4.search-result-zone > div > div:nth-child(1) > div.row > a`;
        let firstSeriesInFirstColumnSelectorSecondTry = '#root > div.bubble-body > header > div > nav > div.collapse.navbar-collapse > div > div > div > div.home-search-bar.rounded-medium.input-group.bg-black.align-items-center.over-global-overlay > div.shadow.p-3.px-4.search-result-zone > div > div:nth-child(1) > div.row > a:nth-child(1)';

        return await this.usingBrowser(async (page: Page) => {
            await Promise.all([
                page.waitForNavigation(),
                page.goto(this.getUrl())
            ]);
            try {
                const someBook = series.books[0];
                if (!someBook) {
                    throw new Error('cannot process an empty series');
                }
                debug.debug( someBook.europeanArticleNumber.toString())
                await page.fill(searchBarSelector, someBook.europeanArticleNumber.toString())

                try {
                    await Promise.all([
                        page.waitForNavigation({timeout: 2500}),
                        page.locator(firstSeriesInFirstColumnSelector).click()
                    ]);

                } catch (e) {
                    await Promise.all([
                        page.waitForNavigation({timeout: 2500}),
                        page.locator(firstSeriesInFirstColumnSelectorSecondTry).click()
                    ]);
                }

                return new URL(page.url()).pathname;
            } catch (err) {
                debug.error(err);
                throw new Error('Cannot find series url');
            }
        });
    }

    public async getBookLinksInSeriesPage (link: string): Promise<string[]> {
        debug.trace( 'getBookLinksInSeriesPage')
        debug.debug( link)
        try {

            return await this.usingBrowser(async (page: Page) => {
                await Promise.all([
                    page.waitForNavigation(),
                    page.goto(this.getUrl(link))
                ]);

                let tomes: ElementHandle<HTMLElement | SVGElement>[] = [];
                let errorCounter = 0
                while (tomes.length === 0) {
                    await page.waitForTimeout(100);
                    tomes = await page.$$('.album-card') as ElementHandle<HTMLElement | SVGElement>[];
                    errorCounter++;
                    if (errorCounter > 30) {
                        throw Error('Something is wrong, may be a timeout');
                    }
                }

                errorCounter = 0
                const links = [];
                while (links.length === 0) {
                    await page.waitForTimeout(100);
                    for (const htmlBook of tomes) {
                        links.push(await (await htmlBook.$$('a'))[0].getAttribute('href'))
                    }
                    errorCounter++;
                    if (errorCounter > 30) {
                        throw Error('Something is wrong, may be a timeout');
                    }
                }

                if (links.some(l => l === null)) {
                    throw new Error('Some link results are null');
                }

                return links as string[];
            });
        } catch (err) {
            debug.error(err);
            throw new Error('Cannot find series url');
        }
    }
    public getUrl(suffix: string = ''): string {
        let baseUrl = process.env.SCRAPPED_URL || '';
        if(baseUrl.endsWith('/')) {
            baseUrl =  baseUrl.substring(0, baseUrl.length - 1);
        }
        return (baseUrl + suffix)
    }

    public async getBookEuropeanArticleNumberInBookPage (bookUrl: string): Promise<number> {
        debug.trace( 'getBookEuropeanArticleNumberInBookPage')
        debug.debug( bookUrl);
        const eanSelector = '#root > div.bubble-body > div.bb-background-light-grey > div:nth-child(2) > div > div.col-md-6.pt-4.pt-md-0 > table:nth-child(4) > tbody > tr:nth-child(5) > td:nth-child(2)'

        return await this.usingBrowser(async page => {
            await Promise.all([
                page.waitForNavigation(),
                page.goto(this.getUrl(bookUrl))
            ]);

            let ean = '';

            while (ean === undefined || ean === '') {
                await page.waitForTimeout(200);
                ean = await page.locator(eanSelector).innerText({timeout: 200});
            }
            return +ean;
        })
    }

    public async getBookLink(ean: string): Promise<string> {
        debug.trace( 'getBookLink')
        debug.debug( ean)
        const theFirstBookInSecondColumnSelector = `#root > div.bubble-body > header > div > nav > div.collapse.navbar-collapse > div > div > div > div.home-search-bar.rounded-medium.input-group.bg-black.align-items-center.over-global-overlay > div.shadow.p-3.px-4.search-result-zone > div > div:nth-child(3) > div.row > a:nth-child(1)`;
        const sameBookButDifferentVersionListSelector = '#root > div.bubble-body > div.bb-background-light-grey > div:nth-child(1) > div > div.row.px-sm-3.mt-n3 > div.col-lg-8.my-3.d-flex.flex-column.justify-content-between > div.row.px-3.my-3 > div > div.row.py-2.px-md-3.d-flex.flex-row.flex-wrap.justify-content-start > div > div > div.col-9.d-flex.flex-column > div.text-muted'

        try {
            return await this.usingBrowser(async page => {
                await Promise.all([
                    page.waitForNavigation(),
                    page.goto(this.getUrl())
                ]);

                await page.fill('nav input', ean)
                await Promise.all([
                    page.waitForNavigation(),
                    page.locator(theFirstBookInSecondColumnSelector).click()
                ]);

                await Promise.all([
                    page.waitForNavigation(),
                    page.locator(sameBookButDifferentVersionListSelector, {
                        hasText: ean
                    }).click()
                ])
                return new URL(page.url()).pathname;
            })

        } catch (e: any) {
            debug.error(ean, e)
            throw e
        }
    }

    public async getRawBooks(login: string, password: string) {
        debug.trace( 'refreshBook')

        return await this.usingBrowser(async (page: Page) => {
            await Promise.all([
                page.waitForNavigation(),
                page.goto(this.getUrl())
            ]);
            await Promise.all([
                page.waitForNavigation(),
                page.click('.nav-link[href="/login"]')
            ]);
            await page.fill('#emailform', login);
            await page.fill('#passwordform', password);
            await page.waitForTimeout(100);
            await Promise.all([
                page.waitForNavigation(),
                page.click('.container button.btn.px-5.btn-lg.btn-secondary:has-text("Connexion")')
            ]);
            await page.waitForTimeout(100);

            await Promise.all([
                page.waitForNavigation(),
                page.goto(this.getUrl('/my-account/my-settings'))
            ]);
            await page.waitForTimeout(100);

            const [download] = await Promise.all([
                page.waitForEvent('download'),
                page.locator('a:has-text("Exporter ma collection")').click()
            ]);

            const books: RawBook[] = []
            const csvStream = await download.createReadStream()

            if (!!csvStream) {

                const handleCsv = async <T>(stream: Readable): Promise<T[]> => {
                    const results: T[] = [];
                    return new Promise((res, rej) => {
                        csvStream.pipe(csv({
                            separator: ';'
                        }))
                            .on('data', (data) => results.push(data))
                            .on('error', (err) => rej(err))
                            .on('end', () => {
                                res(results);
                            });
                    })
                }

                books.push(...await handleCsv(csvStream) as RawBook[])
                download.delete();
            }

            return books;
        })
    }

    public async getBookOwnedEditionUrl(bookUrl: string, possibleEan: number[]) {
        debug.trace( 'getBookOwnedEditionUrl')
        debug.debug( bookUrl)

        return await this.usingBrowser(async page => {
            await Promise.all([
                page.waitForNavigation(),
                page.goto(this.getUrl(bookUrl))
            ]);

            const differentEditionsSelector = '#root > div.bubble-body > div.bb-background-light-grey > div:nth-child(1) > div > div.row.px-sm-3.mt-n3 > div.col-lg-8.my-3.d-flex.flex-column.justify-content-between > div.row.px-3.my-3 > div > div.row.py-2.px-md-3.d-flex.flex-row.flex-wrap.justify-content-start > div'
            const myEdition = await page.locator(differentEditionsSelector, {
                hasText: new RegExp(possibleEan.join("|"), 'gi')
            });

            if((await myEdition.count()) === 1) {
                await Promise.all([
                    page.waitForNavigation(),
                    myEdition.click()
                ]);

                return new URL(page.url()).pathname;
            }

            return null
        })
    }
}

export default new BrowserController();
