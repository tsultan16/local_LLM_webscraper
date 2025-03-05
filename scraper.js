import { chromium } from 'playwright';
import fetch from 'node-fetch';
// import cheerio from 'cheerio';
import sharp from 'sharp';


async function processElement(element) {
    return await element.evaluate(node => {
        let elementText = "";
        const processNode = (currentNode) => {
            currentNode.childNodes.forEach(childNode => {
                if (childNode.nodeType === Node.TEXT_NODE) {
                    elementText += (childNode.textContent + "\n");
                } else if (childNode.nodeName.toLowerCase() === 'a') {
                    const anchorText = childNode.textContent;
                    const href = childNode.getAttribute('href');
                    elementText += `${anchorText} (${href})`;
                } else if (childNode.nodeName.toLowerCase() !== 'script' && childNode.nodeName.toLowerCase() !== 'style') { // ADDED THIS CONDITION: Exclude script and style tags
                    processNode(childNode); // Recursively process other elements, BUT NOT script/style
                }
                // (Implicitly, we are now skipping <script> and <style> tags and their children)
            });
        };
        processNode(node);
        return elementText;
    });
}


async function scrapeWebpageWithPlaywright(url, getHyperLinks) {
    const browser = await chromium.launch({
        headless: true, 
        // Realistic User-Agent to mimic a common browser (Chrome on Windows)
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await browser.newPage();

    try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
        
        console.log(response.status())

        if (response.status() !== 200) {
            throw new Error(`GET request unsuccessful with status code: ${response.status()} for URL: ${url}`);
        }

        let textContent;
        textContent = await page.textContent('body'); 

        if (getHyperLinks) {
            const bodyElement = await page.$('body');
            if (bodyElement) {
                textContent = await processElement(bodyElement);
            }
        }

        await browser.close();
        return textContent;

    } catch (error) {
        await browser.close(); 
        throw error; // Re-throw the error to be caught by the calling function
    }
}


async function scrapeWebpageWithPlaywrightLinks(url) {
    const browser = await chromium.launch({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await browser.newPage();

    try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded' });

        console.log(response.status())
        if (response.status() !== 200) {
            throw new Error(`GET request unsuccessful with status code: ${response.status()} for URL: ${url}`);
        }


        // Optimized processElement function, now EXCLUDING script and style tags
        async function processElement(element) {
            return await element.evaluate(node => {
                let elementText = "";
                const processNode = (currentNode) => {
                    currentNode.childNodes.forEach(childNode => {
                        if (childNode.nodeType === Node.TEXT_NODE) {
                            elementText += (childNode.textContent + "\n");
                        } else if (childNode.nodeName.toLowerCase() === 'a') {
                            const anchorText = childNode.textContent;
                            const href = childNode.getAttribute('href');
                            elementText += `${anchorText} (${href})`;
                        } else if (childNode.nodeName.toLowerCase() !== 'script' && childNode.nodeName.toLowerCase() !== 'style') { // ADDED THIS CONDITION: Exclude script and style tags
                            processNode(childNode); // Recursively process other elements, BUT NOT script/style
                        }
                        // (Implicitly, we are now skipping <script> and <style> tags and their children)
                    });
                };
                processNode(node);
                return elementText;
            });
        }


        const bodyElement = await page.$('body');
        let fullTextWithLinks = "";
        if (bodyElement) {
            fullTextWithLinks = await processElement(bodyElement);
        }

        await browser.close();
        return fullTextWithLinks;

    } catch (error) {
        await browser.close();
        throw error;
    }
}



// async function scrapeWebpageWithCheerio(url) {
//     try {
//         const response = await fetch(url, {
//             // You can set a User-Agent header here, though it's less impactful for Cheerio-based scraping as it doesn't execute JavaScript
//             headers: {
//                 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
//             }
//         });

           // if (response.status() !== 200) {
           //     throw new Error(`GET request unsuccessful with status code: ${response.status()} for URL: ${url}`);
           // }

//         const html = await response.text();
//         const $ = cheerio.load(html); // Load HTML into Cheerio


//         // Extract and return ALL text content from the webpage
//         const allTextContent = $('body').text(); // Get text content of the entire <body> element
//         return allTextContent;

//     } catch (error) {
//         // Error handling: re-throw the error to be caught by the calling function
//         throw error;
//     }
// }


async function scrape(url, getHyperLinks = false) {
    const urlToScrape = url;
    let scrapedText = undefined
    try {
        scrapedText = await scrapeWebpageWithPlaywright(urlToScrape, getHyperLinks);        
        if (scrapedText) {
            // Replace more than 2 consecutive newlines with an empty string
            scrapedText = scrapedText.replace(/\n{2,}/g, '');
        }
    } catch (error) {
        console.error("Scraping failed due to potential blocking:", error.message);
    } 
    return scrapedText;
}



async function splitImageVertically(imagePath, chunkHeight) {
    const metadata = await sharp(imagePath).metadata(); 
    const imageHeight = metadata.height;
    const imageWidth = metadata.width;

    const numChunks = Math.ceil(imageHeight / chunkHeight);
    const chunkImagePaths = [];
    let currentY = 0;

    console.log(`Image Dimensions: ${imageWidth}x${imageHeight}, Chunk Height: ${chunkHeight}, Num Chunks: ${numChunks}`);

    for (let i = 0; i < numChunks; i++) {
        const startY = currentY;
        let currentChunkHeight = chunkHeight;
        const remainingHeight = imageHeight - startY;
        if (remainingHeight < chunkHeight) {
            currentChunkHeight = remainingHeight;
        }

        if (currentChunkHeight <= 0) {
            console.log(`Stopping chunking: currentChunkHeight became <= 0 (remainingHeight=${remainingHeight}, startY=${startY}, imageHeight=${imageHeight}).`);
            break;
        }

        const chunkOutputPath = `./screenshots/chunk_${i + 1}.png`;

        console.log(`Chunk ${i + 1}: startY=${startY}, currentChunkHeight=${currentChunkHeight}, imageHeight=${imageHeight}`);

        try {
            // Create a NEW sharp object for each chunk extraction
            const image = sharp(imagePath); 

            await image // Use the new image object for extraction
                .extract({ left: 0, top: startY, width: imageWidth, height: currentChunkHeight })
                .toFile(chunkOutputPath);

            chunkImagePaths.push(chunkOutputPath);
            console.log(`Chunk ${i + 1} saved to ${chunkOutputPath} (height: ${currentChunkHeight}px)`);
        } catch (extractError) {
            console.error(`Error extracting chunk ${i + 1}:`, extractError);
        }

        currentY += currentChunkHeight;
    }

    return chunkImagePaths;
}


async function getScreenshot(url, chunkHeight=1024) {
    const browser = await chromium.launch({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await browser.newPage();

    try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded' });

        const pageDimensions = await page.evaluate(() => {
            return {
                width: document.documentElement.scrollWidth,
                height: document.documentElement.scrollHeight,
            };
        });

        console.log(`Page Dimensions (scrollWidth x scrollHeight): ${pageDimensions.width}px x ${pageDimensions.height}px`);

        // Take full page screenshot and save to file
        const screenshotPath = './screenshots/screenshot.png';
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Full page screenshot saved to ${screenshotPath}`);

        // split the full page screenshot along y into equal height chunks
        const chunkImagePaths = await splitImageVertically(screenshotPath, chunkHeight);
        console.log(`Screenshot split into ${chunkImagePaths.length} chunks.`);
        return chunkImagePaths; 

    } catch (error) {
        console.error('Error during screenshot or description:', error);
    } finally {
        await browser.close();
    }


} 



export default { scrape, getScreenshot };
