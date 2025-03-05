import scraper from "./scraper.js";
import google from "./searchEngine.js";


const url = "https://www.bloomtools.com/blog/top-2023-australia-website-directories-you-should-get-your-business-listed-on"


// test text scraping
// const scrapedText = await scraper.scrape(url, true);
// console.log(scrapedText)

// test screenshot capture
// const chunkImagePaths = await scraper.getScreenshot(url);


// test google search
async function findBusinessDirectories() {
    const searchQuery = `melbourne business directory link submission, directory list, SEO`; // Example query
    const directoryResults = await google(searchQuery);
    console.log("Number of results: ", directoryResults.length)
    console.log("Directory Results:", directoryResults);
}

findBusinessDirectories()
