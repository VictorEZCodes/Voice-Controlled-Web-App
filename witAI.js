require('dotenv').config();
const axios = require('axios');

const WIT_TOKEN = process.env.WIT_TOKEN;

const { exec } = require('child_process');

function openApp(appName) {
    return new Promise((resolve, reject) => {
        const command = `osascript -e 'tell application "${appName}" to activate'`;

        console.log(`Attempting to execute: ${command}`);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Execution error for ${appName}: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr) {
                console.error(`Execution stderr for ${appName}: ${stderr}`);
                reject(new Error(stderr));
                return;
            }
            console.log(`${appName} should be opened now.`);
            resolve({ status: 'success', message: `${appName} opened successfully.` });
        });
    });
}


async function processCommand(command) {
    console.log(`Processing command: ${command}`);

    try {
        const response = await axios.get(`https://api.wit.ai/message?v=20210930&q=${encodeURIComponent(command)}`, {
            headers: {
                Authorization: `Bearer ${WIT_TOKEN}`,
            },
        });

        const witResponse = response.data;
        console.log('Wit.ai Response:', witResponse);

        if (witResponse.intents && witResponse.intents.length > 0) {
            const topIntent = witResponse.intents[0].name;
            if (topIntent === 'OpenApp') {
                // Extract app name from the entities field
                const appNameEntity = witResponse.entities['appName:appName'] && witResponse.entities['appName:appName'][0];
                if (appNameEntity) {
                    const appName = appNameEntity.value;
                    console.log(`Attempting to open app: ${appName}`);
                    const openResult = await openApp(appName);
                    return openResult;
                } else {
                    console.log('App name not found in entities.');
                    return { status: 'error', message: 'App name not found.' };
                }
            } else {
                console.log('Intent not recognized or app name not found.');
                return { status: 'error', message: 'Intent not recognized or app name not found.' };
            }
        } else {
            console.log('Intent not recognized.');
            return { status: 'error', message: 'Intent not recognized.' };
        }
    } catch (error) {
        console.error('Error processing command:', error);
        return { status: 'error', message: 'Error processing command.' };
    }
}

module.exports = {
    processCommand
};