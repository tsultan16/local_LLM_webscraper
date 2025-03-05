import scraper from "./scraper.js";



const url = "https://www.bloomtools.com/blog/top-2023-australia-website-directories-you-should-get-your-business-listed-on"

const scrapedText = await scraper.scrape(url, true);
console.log(scrapedText)






