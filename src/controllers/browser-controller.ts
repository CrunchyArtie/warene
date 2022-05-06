import {chromium} from 'playwright-core';
import {Browser, ElementHandle, Page} from 'playwright';
import {Book} from '../models';
import {BookController} from './book-controller';
import debugFactory from 'debug';

import moment from 'moment';
import 'moment/locale/fr'
moment.locale('fr')

const debug = debugFactory('warene:BrowserController');
let browser: Browser | null = null;
export const BrowserController = {
    getBrowser: async () => {
        let headless = true;

        if (!!process.env.HEADLESS) {
            headless = process.env.HEADLESS === 'true'
        }
        browser = browser || (await chromium.launch({
            headless: headless
        }));

        return browser;
    },
    connect: async (url: string): Promise<Page> => {
        const browser = await BrowserController.getBrowser();
        const page = await browser.newPage();
        await page.goto(url);
        return page;
    },
    disconnect: async () => {
        if (!!browser) {
            await browser.close();
            browser = null;
        }
    },
    completeSeries: async (baseUrl: string, userBook: Book) => {
        debug('trace', 'completeSeries')
        debug('debug', userBook.europeanArticleNumber)

        const searchBarSelector = 'nav input';
        const firstSeriesInFirstColumnSelector = `#root > div.bubble-body > header > div > nav > div.collapse.navbar-collapse > div > div > div > div.home-search-bar.rounded-medium.input-group.bg-black.align-items-center.over-global-overlay > div.shadow.p-3.px-4.search-result-zone > div > div:nth-child(1) > div.row > a`;
        let firstSeriesInFirstColumnSelectorSecondTry = '#root > div.bubble-body > header > div > nav > div.collapse.navbar-collapse > div > div > div > div.home-search-bar.rounded-medium.input-group.bg-black.align-items-center.over-global-overlay > div.shadow.p-3.px-4.search-result-zone > div > div:nth-child(1) > div.row > a:nth-child(1)';

        const inError = [];
        const page = await BrowserController.connect(baseUrl)
        if (page) {
            await Promise.all([
                page.waitForNavigation(),
                page.goto(baseUrl)
            ]);

            try {
                debug('get', 'completeSeries', userBook.europeanArticleNumber.toString(), 'waiting')

                await page.fill(searchBarSelector, userBook.europeanArticleNumber.toString())

                try {
                    await Promise.all([
                        page.waitForNavigation({timeout: 5000}),
                        page.locator(firstSeriesInFirstColumnSelector).click()
                    ]);
                } catch (e) {
                    await Promise.all([
                        page.waitForNavigation({timeout: 5000}),
                        page.locator(firstSeriesInFirstColumnSelectorSecondTry).click()
                    ]);
                }


                let tomes: ElementHandle<HTMLElement | SVGElement>[] = [];
                let errorCounter = 0
                while (tomes.length === 0) {
                    await page.waitForTimeout(100);
                    tomes = await page.$$('.album-card') as ElementHandle<HTMLElement | SVGElement>[];
                    errorCounter++;
                    if(errorCounter > 30) {
                        throw Error('Je pense a un timeout');
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
                    if(errorCounter > 30) {
                        throw Error('Je pense a un timeout');
                    }
                }

                if (links.length === 0) {
                    inError.push(userBook.series.name);
                }

                for (const link of links) {
                    await Promise.all([
                        page.waitForNavigation(),
                        page.goto(baseUrl + link)
                    ]);

                    const book = await BrowserController.processBookPage(page);
                    book.seriesId = userBook.seriesId;
                    await book.save();
                    debug('trace', book.prettyTitle, 'done')
                }
            } catch (e: any) {
                debug('error', userBook.europeanArticleNumber, e)
                throw e
            } finally {
                await BrowserController.disconnect();
            }
        }
    },
    refreshBook: async (ean: string) => {
        debug('trace', 'refreshBook')
        debug('debug', ean)
        const theFirstBookInSecondColumnSelector = `#root > div.bubble-body > header > div > nav > div.collapse.navbar-collapse > div > div > div > div.home-search-bar.rounded-medium.input-group.bg-black.align-items-center.over-global-overlay > div.shadow.p-3.px-4.search-result-zone > div > div:nth-child(3) > div.row > a:nth-child(1)`;
        const sameBookButDifferentVersionListSelector = '#root > div.bubble-body > div.bb-background-light-grey > div:nth-child(1) > div > div.row.px-sm-3.mt-n3 > div.col-lg-8.my-3.d-flex.flex-column.justify-content-between > div.row.px-3.my-3 > div > div.row.py-2.px-md-3.d-flex.flex-row.flex-wrap.justify-content-start > div > div > div.col-9.d-flex.flex-column > div.text-muted'
        try {
            const baseUrl = process.env.SCRAPPED_URL || 'https://books.toscrape.com/';
            const page = await BrowserController.connect(baseUrl);
            if (page) {
                await Promise.all([
                    page.waitForNavigation(),
                    page.goto(baseUrl)
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

                const book = await BrowserController.processBookPage(page);
                debug('debug', book.prettyTitle, 'done')
            }
        } catch (e: any) {
            debug('error', ean, e)
            throw e
        } finally {
            await BrowserController.disconnect();
        }
    },
    processBookPage: async (page: Page) => {
        debug('trace', 'processBookPage')
        debug('debug', page.url())
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
        debug('debug', 'ean', ean);
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
}
