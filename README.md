## AI-powered webpage Scraper/Parser

We use Playwright to scrape text from and take screenshots of webpages.

Then local LLMs (running with Ollama) are used to parse the scraped text and screenshots to extract relevant information.

As an example use-case, we attempt to use our technique to extract business directory listings from scraped webpages (obtained from a google search).

To run the project, clone the repo then run:
```shell
npm install
```

We have two separate LLM parsers, one for scraped text and another for the screenshots.

By default, the text parser expects Ollama to have `llama3.2` and the vision parser expects `llama3.2-vision`. Feel free to swap these out with other appropriate models. 


