import ollama from 'ollama'
import fs from 'fs';
import sharp from 'sharp';


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


const parsePageScreenshot = async (screenshotPath, maxChunkHeight=1024) => {
    // since the full-page screenshot can have a huge height, we split it up into chunks of height=maxChunkHeight pixels
    const chunkImagePaths = await splitImageVertically(screenshotPath, maxChunkHeight)
    
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

