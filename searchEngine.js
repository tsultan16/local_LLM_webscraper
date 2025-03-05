import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const searchEngineId = process.env.GOOGLE_SE_ID;


const google = async (query, numPages=10) => {

    const resultsPerPage = 10; // Fixed at 10 for PSE

    let allResults = [];
    let start = 1; // Start from the first result
    let page = 1;
    let totalResultsFetched = 0;

    while (page <= numPages) { // Loop through pages
        const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&start=${start}&num=${resultsPerPage}`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                allResults = allResults.concat(data.items.map(item => ({
                    title: item.title,
                    link: item.link,
                    snippet: item.snippet
                })));
                totalResultsFetched += data.items.length;
                start += resultsPerPage; // Increment for the next page
                page++;

            } else {
                console.log("No more results on page", page, "or API returned empty results. Stopping pagination.");
                break; // No more results, stop paginating
            }

        } catch (error) {
            console.error("Google Search API Error on page", page, ":", error);
            break; // Stop pagination on error
        }
    }

    console.log(`Fetched ${totalResultsFetched} results across ${page - 1} pages.`);
    return allResults;
}


export default google;




















