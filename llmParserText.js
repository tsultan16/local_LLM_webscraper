/*
        We will use a locally running LLM (via Ollama) to parse 
        the contents of scraped webpages and extract information about 
        business directories.

*/ 

import ollama from 'ollama'


function chunkStringWithOverlap(text, chunkSize, overlap) {
    if (overlap >= chunkSize) {
        throw new Error("Overlap must be less than chunk size.");
    }
    if (chunkSize <= 0 || overlap < 0) {
        throw new Error("Chunk size must be positive and overlap must be non-negative.");
    }

    const chunks = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        const chunk = text.substring(start, end);
        chunks.push(chunk);

        start += (chunkSize - overlap); // Move start position for the next chunk
    }

    return chunks;
}

const AVG_CHARS_PER_TOKEN = 3.5;
const approx_chars_to_tokens = (charCount) => charCount / AVG_CHARS_PER_TOKEN;  
const approx_tokens_to_chars = (tokenCount) => tokenCount * AVG_CHARS_PER_TOKEN;  

const estimate_tokens = (s) => approx_chars_to_tokens(s.length);

const invokeLLM = async (messages, model="llama3.2") => {
    try {
        const response = await ollama.chat({
            model,
            messages,
            format: "json",
            options: {
                temperature: 0,
                num_ctx: 8192,
            }
        });
        return response;

    } catch (error) {
        console.log("Failed to invoke LLM: ", error);
    }
}


// define business directory extraction prompts for LLM, outputs will strictly be in JSON format 
const systemPrompt =  ` You are an expert at extracting business directories from scraped webpages. You will analyze scraped content to find and compile a list of business directories.

                        Your response MUST ALWAYS be formatted as a JSON object with a single key named "directories" at the root level. The value of the "directories" key MUST be a JSON array.

                        - If business directories ARE found in the scraped content, the "directories" array MUST contain JSON objects, where each object represents a business directory and has these two keys: "name" and "url".
                        - If NO business directories are found in the scraped content, the "directories" array MUST be an EMPTY JSON array (i.e., []).

                        Example of a valid JSON response when directories ARE found:
                        {
                        "directories": [
                            {
                            "name": "Example Directory 1",
                            "url": "https://exampledirectory1.com",
                            },
                            {
                            "name": "Example Directory 2",
                            "url": "https://exampledirectory2.com",
                            }
                        ]
                        }

                        Example of a valid JSON response when NO directories are found:
                        {
                        "directories": []
                        }
                    `

const userPrompt = `Please extract business directories from the following: \n`;



const parsePageText = async (scrapedText, maxChunkTokens=5000, overlapTokens=100) => {
    // estimate number of tokens and split into chunks if too big (i.e roughly bigger than 5k tokens by default)
    const numTokens = estimate_tokens(scrapedText)
    let textChunks;
    if (numTokens < maxChunkTokens) {
        textChunks = [scrapedText]
    } else {
        // calculate chunk size in chars
        const chunkSizeChars = approx_tokens_to_chars(maxChunkTokens);
        const overlapChars = approx_tokens_to_chars(overlapTokens);
        textChunks = chunkStringWithOverlap(scrapedText, chunkSizeChars, overlapChars)
        console.log(`split text into ${textChunks.length} chunks, each of size roughly ${chunkSizeChars} characters with overlap of ${overlapChars} characters`)
    }

    
    const allDirectories = []; // Array to store responses for each chunk
    let totalTokensUsed = { promptTokens: 0, completionTokens: 0 }; // To accumulate token usage
    
    console.log('LLM Responses for each chunk:');
    
    let i = 0
    for (const chunk of textChunks) {
        i++;
        const messagesForChunk = [
            // { role: "control", content: "thinking" },
            { role: "system", content: systemPrompt },
            { role: "user", content: String(userPrompt+chunk) }, 
        ]
        
        try {
            process.stdout.write(`\n\n--- Chunk ${i} of ${textChunks.length} ---\n\n`);
            process.stdout.write(chunk)
    
            const response = await invokeLLM(messagesForChunk);
            
            process.stdout.write(`\n\n--- Response ---\n\n`);
            process.stdout.write('LLM >> ');
            process.stdout.write(response.message.content); 
            // console.log(response)

            let directoriesFromChunk = []; 
    
            try {
                const parsedResponse = JSON.parse(response.message.content);
    
                if (parsedResponse && typeof parsedResponse === 'object' && parsedResponse.directories !== undefined) { // Check for object with 'directories' key
                    if (Array.isArray(parsedResponse.directories)) { // Check if 'directories' value is an array
                        if (parsedResponse.directories.length > 0) {
                            directoriesFromChunk = parsedResponse.directories;
                            
                            process.stdout.write(`\n\n--- Parsed Output ---\n\n`);
                            console.log("Num directories found: ", directoriesFromChunk.length)
                            console.log(JSON.stringify(directoriesFromChunk, null, 2)); // Print parsed directories for this chunk
                            allDirectories.push(...directoriesFromChunk); // Add directories from this chunk to the main array
                        } else {
                            console.log()
                            console.log("No directories found in this chunk (empty JSON array in 'directories' key).");
                        }
                    } else {
                        console.warn("Warning: LLM response 'directories' key is not an array, but array expected. Response content:", response.content);
                    }
                } else {
                    console.warn("Warning: LLM response is not a JSON object with 'directories' key, unexpected format. Response content:", response.content);
                }
    
    
            } catch (jsonError) {
                console.error("JSON Parsing Error for chunk response:", jsonError);
                console.error("Response content that caused the error:", response.message.content);
            }
            process.stdout.write('\n\n--- End Chunk Response and Parsing ---\n\n');
            console.log({ prompt_tokens : response.prompt_eval_count, response_tokens: response.eval_count })
    
            totalTokensUsed.promptTokens += response.prompt_eval_count || 0; // Accumulate prompt tokens
            totalTokensUsed.completionTokens += (response.prompt_eval_count + response.eval_count) || 0; // Accumulate completion tokens
    
        } catch (error) {
            console.error("Error processing chunk:", error);
        }
    }
    
    
    // remove duplicate directory urls
    let uniqueDirs = {}
    allDirectories.forEach(dirObject => {
        if (dirObject.url) {
            if (!(dirObject.url in uniqueDirs)) {
                uniqueDirs[dirObject.url] = dirObject
            } else {
                if ((uniqueDirs[dirObject.url].name === "") && (dirObject.name !== "")) {
                    uniqueDirs[dirObject.url] = dirObject
                }
            }
        } else {
            // directory url may not be available 
            uniqueDirs[dirObject.name] = dirObject
        }
    })

    uniqueDirs = Object.values(uniqueDirs);

    console.log()
    console.log("\n--- Summary ---");
    console.log(`Total Chunks Processed: ${textChunks.length}`);
    console.log("All Extracted Directories (Combined):");
    console.log(JSON.stringify(uniqueDirs, null, 2)); // Print the combined array of directories
    console.log(`Total Directories Extracted (across all chunks): ${uniqueDirs.length}`);
    console.log(`Total Tokens Used:`);
    console.log(JSON.stringify(totalTokensUsed, null, 2));
    
    return uniqueDirs;
}


export default { parsePageText };