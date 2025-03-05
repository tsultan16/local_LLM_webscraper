import scraper from "./scraper.js";
import google from "./searchEngine.js";
import llmParserText from "./llmParserText.js";
import llmParserVision from "./llmParserVision.js";

const count = (s) => s.trim().split(/\s+/).length;
const estimate_tokens = (s) => s.length / 3.5;

const url = "https://www.bloomtools.com/blog/top-2023-australia-website-directories-you-should-get-your-business-listed-on"
// const url = "https://www.mindmingles.com/directory-submission-sites/"


// test text scraping
// const scrapedText = await scraper.scrape(url, true);
// if (!scrapedText) {
//     console.log("Failed to scrape webpage!")
//     process.exit()
// }
//console.log(scrapedText)

// console.log()
// console.log("approx word count: ", count(scrapedText))
// console.log("approx token count: ", estimate_tokens(scrapedText))
// console.log()


// test google search
async function findBusinessDirectories() {
    const searchQuery = `melbourne business directory link submission, directory list, SEO`; // Example query
    const directoryResults = await google(searchQuery);
    console.log("Number of results: ", directoryResults.length)
    console.log("Directory Results:", directoryResults);
}

// findBusinessDirectories()

// await llmParserText.parsePageText(scrapedText);



// test screenshot capture
const screenshotPath = await scraper.getScreenshot(url);
await llmParserVision.parsePageScreenshot(screenshotPath);

