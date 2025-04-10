import { PNG } from 'pngjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ask } from "./helpers/cli.js";
import pixelmatch from 'pixelmatch';
import fs from 'fs';
import path from 'path';

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

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    async take(page, name = 'before') {
        if (
            !page ||
            typeof page.goto !== 'function' ||
            typeof page.screenshot !== 'function'
        ) {
            throw new Error(
                'Invalid `page` object passed to ScreenshotService. Make sure to pass a Playwright Page instance.'
            );
        }

        const filePath = name === 'before' ? this.beforePath : this.afterPath;

        await page.goto(this.url);
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: filePath, fullPage: true });

        console.log(`Screenshot saved: ${filePath}`);
    }

    async compare() {
        console.log('Comparing screenshots...');

        const imgBefore = PNG.sync.read(fs.readFileSync(this.beforePath));
        const imgAfter = PNG.sync.read(fs.readFileSync(this.afterPath));
        const { width, height } = imgBefore;

        const diff = new PNG({ width, height });

        const diffPixels = pixelmatch(
            imgBefore.data,
            imgAfter.data,
            diff.data,
            width,
            height,
            { threshold: 0.1 }
        );

        const diffDir = path.dirname(this.diffPath);
        if (!fs.existsSync(diffDir)) {
            fs.mkdirSync(diffDir, { recursive: true });
        }

        fs.writeFileSync(this.diffPath, PNG.sync.write(diff));

        console.log(`Visual difference saved to: ${this.diffPath}`);
        console.log(`${diffPixels} pixels differ between snapshots.`);

        if (diffPixels > this.pixelDiffThreshold) {
            console.log(`\nPlease manually review the diff image: ${this.diffPath}`);
            const answer = await ask('\nContinue anyway? (yes/no): ');

            if (answer === 'yes' || answer === 'y') {
                console.log('Continuing despite visual differences...');
            } else {
                throw new Error(
                    `Visual difference exceeds threshold (${diffPixels} > ${this.pixelDiffThreshold})`
                );
            }
        }

        return diffPixels;
    }
}
