import ollama from 'ollama'
import fs from 'fs';
import { parse } from 'path';


// define business directory extraction prompt for LLM 
const userPrompt = `This is one chunk from a sequence of chunks of a full-page screenshot of a webpage. 
                        What is this section of the webpage about? 
                        Does it mention anything about business directories or provide 
                        a list of business directories? If so, then give me that list.`;


async function describeScreenshot(image, model = "llama3.2-vision") {

    const messages = [
        { role: 'user', content: userPrompt, images: [image] }
    ]

    const response = await ollama.chat({
        model,
        messages,
        options: {
            temperature: 0,
            num_ctx: 8192,
        }
    });
    return response;

} 


const parsePageScreenshot = async (chunkImagePaths) => {
    let i = 1
    for (const chunkPath of chunkImagePaths) {
        const imageBuffer = fs.readFileSync(chunkPath);
        const base64Image = imageBuffer.toString('base64');
        const response = await describeScreenshot(base64Image);
        process.stdout.write(`\n--- Chunk ${i} of ${chunkImagePaths.length}---\n`);
        process.stdout.write(`\n--- Response ---\n`);
        console.log(response)
        process.stdout.write('\n--- End Chunk Response ---\n');
        i++;
    }
    
}


export default { parsePageScreenshot };

