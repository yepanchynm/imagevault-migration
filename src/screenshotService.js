import { PNG } from 'pngjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ask } from "./helpers/cli.js";
import pixelmatch from 'pixelmatch';
import fs from 'fs';
import path from 'path';
import {chromium} from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ScreenshotService {
    constructor(uuid, url, outputDir = '../data/snapshots', pixelDiffThreshold = 10) {
        this.url = url;
        this.uuid = uuid;
        this.outputDir = path.resolve(__dirname, outputDir);
        this.beforePath = path.join(this.outputDir, 'before', `${uuid}.png`);
        this.afterPath = path.join(this.outputDir, 'after',  `${uuid}.png`);
        this.diffPath = path.join(this.outputDir, 'diff', `${uuid}.png`);
        this.pixelDiffThreshold = pixelDiffThreshold;
        this.compareLogPath = path.join(this.outputDir, `errors.csv`);

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        if (!fs.existsSync(this.compareLogPath)) {
            fs.writeFileSync(this.compareLogPath, 'BEFORE PATH,AFTER PATH,DIFF PATH\n')
        }
    }

    async take(name = 'before') {
        const browser = await chromium.launch();
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.route('**/*', route => {
            route.continue({
                headers: {
                    ...route.request().headers(),
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                }
            });
        });

        const filePath = name === 'before' ? this.beforePath : this.afterPath;
        const timestamp = Date.now();

        await page.goto(this.url + `?t=${name}&_=${timestamp}`, { waitUntil: 'networkidle' });
        await page.reload({ waitUntil: 'networkidle' });
        await page.screenshot({ path: filePath, fullPage: true });

        await page.close();
        await context.close();
        await browser.close();

        console.log(`Screenshot saved: ${filePath}`);
    }

    /** Creates a diff of the given input images, which may have different sizes.
     * @param {PNG} img1
     * @param {PNG} img2
     * @param {pixelmatch.PixelmatchOptions} options
     * @returns {{diff: PNG, numOfDiffPixels: number}}
     */
    createDiff(img1, img2, options = {}) {
        const diffDimensions = {
            width: Math.max(img1.width, img2.width),
            height: Math.max(img1.height, img2.height),
        };

        const resizedImg1 = this.createResized(img1, diffDimensions);
        const resizedImg2 = this.createResized(img2, diffDimensions);

        const diff = new PNG(diffDimensions);

        let numOfDiffPixels = -1

        try {
            numOfDiffPixels = pixelmatch(
                resizedImg1.data,
                resizedImg2.data,
                diff.data,
                diffDimensions.width,
                diffDimensions.height,
                options,
            );
        } catch (e) {
            console.error(e);
        }

        return { diff, numOfDiffPixels };
    }

    /** Cretes a copy of {@link img}, with the {@link dimensions}.
     * @param {PNG} img
     * @param {{width: number, height: number}} dimensions
     * @returns {PNG}
     */
    createResized(img, dimensions) {
        if(img.width > dimensions.width || img.height > dimensions.height) {
            throw new Error(`New dimensions expected to be greater than or equal to the original dimensions!`);
        }
        const resized = new PNG(dimensions);
        PNG.bitblt(img, resized, 0, 0, img.width, img.height);

        return resized;
    }

    async compare() {
        console.log('Comparing screenshots...');

        const imgBefore = PNG.sync.read(fs.readFileSync(this.beforePath));
        const imgAfter = PNG.sync.read(fs.readFileSync(this.afterPath));
        const { diff, numOfDiffPixels } = this.createDiff(imgBefore, imgAfter, { threshold: 0.1 })

        const diffDir = path.dirname(this.diffPath);
        if (!fs.existsSync(diffDir)) {
            fs.mkdirSync(diffDir, { recursive: true });
        }

        fs.writeFileSync(this.diffPath, PNG.sync.write(diff));

        console.log(`Visual difference saved to: ${this.diffPath}`);
        console.log(`${numOfDiffPixels} pixels differ between snapshots.`);

        if (numOfDiffPixels > this.pixelDiffThreshold || numOfDiffPixels < 0) {
            console.log(`\nPlease manually review the diff image: ${this.diffPath}`);

            fs.appendFile(this.compareLogPath, `${this.beforePath},${this.afterPath},${this.diffPath}\n`, 'utf8', (err) => {
                if (err) throw err;
            });

            const answer = await ask('\nContinue anyway? (yes/no): ');

            if (answer === 'yes' || answer === 'y') {
                console.log('Continuing despite visual differences...');
            } else {
                throw new Error(
                    `Visual difference exceeds threshold (${numOfDiffPixels} > ${this.pixelDiffThreshold})`
                );
            }
        }

        return numOfDiffPixels;
    }
}
