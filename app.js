const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';
recognition.interimResults = false;

const startListeningButton = document.getElementById('startListening');
const textInputField = document.getElementById('textInput');

startListeningButton.addEventListener('click', startListening);
textInputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const text = textInputField.value;
        if (text) {
            processCommand(text);
            textInputField.value = '';  // Clear the input field after processing the command
        }
    }
});

const submitTextInputButton = document.getElementById('submitTextInput');

submitTextInputButton.addEventListener('click', () => {
    const text = textInputField.value;
    if (text) {
        processCommand(text);
        textInputField.value = '';  // Clear the input field after processing the command
    }
});

function startListening() {
    recognition.start();
    toggleListening(true); // Pass 'true' to indicate voice recognition is active
}

recognition.onresult = function (event) {
    const last = event.results.length - 1;
    const command = event.results[last][0].transcript;
    processCommand(command);
    toggleListening(false); // Pass 'false' to indicate voice recognition is no longer active
};


function speak(text) {
    text = text.replace(/"/g, ' ');
    responsiveVoice.speak(text, "UK English Female", { rate: 1.1 });
}

const imageInput = document.getElementById('imageInput');
const detectObjectsButton = document.getElementById('detectObjects');

imageInput.addEventListener('change', handleImageUpload);

detectObjectsButton.addEventListener('click', () => {
    const imageFile = imageInput.files[0];
    if (imageFile) {
        performObjectDetection(imageFile);
    }
});

let imageTimeout; // Variable to store the timeout ID

function hideMap() {
    const mapElement = document.getElementById('map');
    if (mapElement) {
        mapElement.style.display = 'none';
    }
}

function handleImageUpload(event) {
    const uploadedImage = document.getElementById('uploadedImage');
    const placeholderImage = document.getElementById('placeholderImage');
    const imageFile = event.target.files[0];

    if (imageFile) {
        // Display the uploaded image and hide the placeholder image
        uploadedImage.style.display = 'block';
        placeholderImage.style.display = 'none';

        // Set the 'src' attribute of the 'uploadedImage' element to the URL of the uploaded image
        uploadedImage.src = URL.createObjectURL(imageFile);

        // Show the existing "Detect Objects" button
        detectObjectsButton.style.display = 'block'; // Show the button

        // Add a click event listener to start object detection
        detectObjectsButton.addEventListener('click', confirmObjectDetection);

        // Set a timer to hide the uploaded image after 5 seconds (adjust the time as needed)
        imageTimeout = setTimeout(() => {
            uploadedImage.style.display = 'none';
            placeholderImage.style.display = 'block';
            detectObjectsButton.style.display = 'none'; // Hide the button
            detectObjectsButton.removeEventListener('click', confirmObjectDetection);
        }, 5000); // 5000 milliseconds = 5 seconds
    } else {
        // If no image is selected, hide the uploaded image and display the placeholder image
        uploadedImage.style.display = 'none';
        placeholderImage.style.display = 'block';

        // Hide the existing "Detect Objects" button
        detectObjectsButton.style.display = 'none'; // Hide the button

        // Remove the click event listener
        detectObjectsButton.removeEventListener('click', confirmObjectDetection);

        // Clear the timeout if it was set
        clearTimeout(imageTimeout);
    }
}

function confirmObjectDetection() {
    // Hide the existing "Detect Objects" button
    detectObjectsButton.style.display = 'none';

    // Provide voice feedback indicating that object detection is in progress
    speak("Detecting objects in the image, please wait...");

    // Perform object detection on the uploaded image
    const imageFile = imageInput.files[0];
    if (imageFile) {
        performObjectDetection(imageFile);
    }
}

const objectDetectionCommands = [
    /detect objects/i,
    /what's in this picture/i,
];

// Add IP Lookup command patterns
const ipLookupCommands = [
    /check the IP of (?:this )?([\d\.]+)(?:, i only need you to provide to me the (.*))?/i,
    /get info for IP (?:address )?([\d\.]+)(?: and only show (.*))?/i,
    /IP lookup for (?:address )?([\d\.]+)(?: and get me the (.*))?/i
];

const ipRequestCommand = /I want to check the info of an IP/i;

const checkBreachButton = document.getElementById('checkBreachButton');
const emailInput = document.getElementById('emailInput');

checkBreachButton.addEventListener('click', () => {
    const email = emailInput.value;
    if (email) {
        checkEmailBreach(email);
    } else {
        alert('Please enter a valid email address.');
    }
});

function processCommand(command) {
    hideMap();
    // Toggle the listening button state after processing the command
    toggleListening();

    command = command.toLowerCase();
    document.getElementById('output').textContent = `You said: ${command}`;

    // Adding logic to detect crypto price request
    // Check for the "paired with" pattern
    const priceMatch = command.match(/^what's the price of (\w+) paired with (\w+)$/);
    if (priceMatch) {
        const currency1 = priceMatch[1];
        const currency2 = priceMatch[2];
        const symbol = currency1 + currency2; // Combining both currencies
        getCryptoPrice(symbol);
        return; // Ensure to return early
    }

    // Check if the command matches any IP Lookup command patterns
    const ipMatch = matchesIPLookupCommand(command);
    if (ipMatch) {
        getIPLookupData(ipMatch.ip, ipMatch.fields);
        return;
    }

    if (command.match(ipRequestCommand)) {
        promptForIP();
        return;
    }

    const pricePatterns = [
        /^what's the price of (\w+)$/,
        /^tell me the price of (\w+)$/,
        /^how much is (\w+) worth$/,
        /^current value of (\w+)$/,
        /^(\w+) current price$/,
        /^(\w+) price right now$/,
        /^can you get me the price of (\w+)$/,
        /^price check for (\w+)$/,
    ];

    let symbol;

    for (let pattern of pricePatterns) {
        const match = command.match(pattern);
        if (match && match[1]) {
            symbol = match[1];
            break; // Exit the loop once a match is found
        }
    }

    if (symbol) {
        getCryptoPrice(symbol);
        return; // Ensure to return early
    }

    // Check if the command matches any object detection command patterns
    if (matchesObjectDetectionCommand(command)) {
        const detectObjectsButton = document.getElementById('detectObjects');
        detectObjectsButton.click();
        return;
    }

    if (isWeatherCommand(command)) {
        const location = extractLocation(command);
        getWeatherData(location);
        return;
    }

    if (isTimeCommand(command)) {
        const location = extractLocationForTime(command);
        getTimeForLocation(location)
            .then(result => {
                displayContent(result);
                speak(result);
            })
            .catch(error => {
                console.error('Error getting time for location:', error);
                const errorMessage = `Sorry, I couldn't fetch the time for ${location}.`;
                displayContent(errorMessage);
                speak(errorMessage);
            });
        return;
    }

    // Check if the command is to prompt for an email breach check
    if (command.toLowerCase() === "check for an email breach") {
        promptForEmailBreach();
        return;
    }

    fetch('/open-app', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                if (data.message && data.message.includes('opened successfully')) {
                    displayContent(data.message);
                    speak(data.message);
                } else {
                    generateContent(command.trim())
                        .then(content => {
                            displayContent(content);
                            speak(content);
                        })
                        .catch(error => {
                            console.error('Error fetching content:', error);
                            const errorMessage = "I'm sorry, but I couldn't generate a response.";
                            displayContent(errorMessage);
                            speak(errorMessage);
                        });
                }
            }
        });

    toggleListening(false);
}

function promptForEmailBreach() {
    // Get the email input field and the check breach button
    var emailInput = document.getElementById('emailInput');
    var checkBreachButton = document.getElementById('checkBreachButton');

    // Make the email input field visible
    emailInput.style.display = 'block';

    // Focus on the email input field so the user can start typing
    emailInput.focus();

    // Function to handle automatic breach check after voice input
    function handleVoiceInput() {
        // Check if the email input field has a value
        if (emailInput.value) {
            // Trigger the check breach function or click the check breach button
            checkBreachButton.click();
        } else {
            // If no value is entered, refocus on the email input field
            emailInput.focus();
        }
    }

    // Add an event listener for the 'Enter' key press to trigger the breach check
    emailInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            handleVoiceInput();
        }
    });

    // Add an event listener for voice recognition result
    recognition.addEventListener('result', function (e) {
        // Get the last result from the recognition event
        var last = e.results.length - 1;
        var text = e.results[last][0].transcript;

        // Set the recognized text as the value of the email input field
        emailInput.value = text;

        // Trigger the automatic breach check
        handleVoiceInput();
    });

    // Add an event listener for the end of the speech recognition
    recognition.addEventListener('end', function () {
        // If the email input field has a value, trigger the breach check
        if (emailInput.value) {
            handleVoiceInput();
        }
    });
}

function checkEmailBreach(email) {
    // Open the Have I Been Pwned website with the entered email
    window.open(`https://haveibeenpwned.com/account/${email}`, '_blank');
}

function matchesIPLookupCommand(command) {
    for (let pattern of ipLookupCommands) {
        const match = command.match(pattern);
        if (match && match[1]) {
            return {
                ip: match[1],
                fields: match[2] ? match[2].split(/\s*,\s*/).map(field => field.trim()) : null
            };
        }
    }
    return null;
}

function isWeatherCommand(command) {
    return /weather|temperature|forecast|how\s+hot|how\s+cold/i.test(command);
}

function extractLocation(command) {
    const patterns = [
        /^weather\s+([\w\s]+)$/i,
        /^([\w\s]+)\s+weather$/i,
        /weather\s+in\s+([\w\s]+)/i,
        /weather\s+for\s+([\w\s]+)/i,
        /temperature\s+in\s+([\w\s]+)/i,
        /how's\s+the\s+weather\s+in\s+([\w\s]+)/i,
        /update\s+on\s+([\w\s]+)\s+weather/i,
        /weather\s+update\s+for\s+([\w\s]+)/i,
        /what\s+is\s+([\w\s]+)\s+current\s+weather/i,
        /what's\s+the\s+weather\s+like\s+in\s+([\w\s]+)/i,
        /in\s+([\w\s]+)\s+(?:weather|temperature|forecast)/i,
        /forecast\s+([\w\s]+)/i,  // Added this pattern
        /update\s+me\s+on\s+([\w\s]+)\s+weather/i,  // Added this pattern
        /tell\s+me\s+the\s+forecast\s+for\s+([\w\s]+)/i,  // Added this pattern
        /traveling\s+to\s+([\w\s]+)\./i  // Existing pattern that should match the last command
    ];

    for (let pattern of patterns) {
        const match = command.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return '';
}

function extractLocationForTime(command) {
    const timePatterns = [
        /what's the time in ([\w\s]+)\?*/i,
        /what is the time in ([\w\s]+)\?*/i,
        /can you tell me the time in ([\w\s]+)\?*/i,
        /tell me the time in ([\w\s]+)\?*/i,
        /current time in ([\w\s]+)\?*/i,
        /time in ([\w\s]+)\?*/i,
        /tell me the current time in ([\w\s]+)\?*/i,
        /what's the current time in ([\w\s]+)\?*/i
    ];

    for (let timePattern of timePatterns) {
        const match = command.match(timePattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return '';
}

function isTimeCommand(command) {
    return /time|what's the time|current time|tell me the time/i.test(command);
}

function generateContent(inputText) {
    return new Promise((resolve, reject) => {
        fetch('/generate-content', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inputText })
        })
            .then(response => response.json())
            .then(data => {
                resolve(data.content);
            })
            .catch(error => {
                console.error('Error fetching content:', error);
                reject(error);
            });
    });
}

function displayContent(content) {
    document.getElementById('content').textContent = content;
}

function getWeatherData(location, command) {  // Include the command parameter
    fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=5&appid=${process.env.OPENWEATHER_API_KEY}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const lat = data[0].lat;
                const lon = data[0].lon;
                fetchWeather(lat, lon, location, command);  // Pass the command to the fetchWeather function
            } else {
                displayContent(`Sorry, I couldn't find the location: ${location}`);
            }
        })
        .catch(error => {
            console.error(`Error fetching location data for ${location}:`, error);
            displayContent('Sorry, I couldn\'t fetch the location data at the moment.');
        });
}

function fetchWeather(lat, lon, location) {
    fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,daily,alerts&appid=${process.env.OPENWEATHER_API_KEY}`)
        .then(response => response.json())
        .then(data => {
            const temperatureCelsius = (data.current.temp - 273.15).toFixed(2); // Convert Kelvin to Celsius and round to two decimal places
            const weatherInfo = `Weather in ${location}: ${data.current.weather[0].description}, Temperature: ${temperatureCelsius}°C`;
            displayContent(weatherInfo);
            speak(weatherInfo); // Speak out the weather information
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
            const errorMessage = 'Sorry, I couldn\'t fetch the weather data at the moment.';
            displayContent(errorMessage);
            speak(errorMessage); // Speak out the error message
        });
}

async function getTimeForLocation(city) {
    try {
        const response = await fetch(`/get-time?city=${city}`);
        const data = await response.json();

        if (data && data.time) {
            // Parse the time string
            const time = new Date(data.time);

            // Get hours, minutes, and seconds
            const hours = time.getHours();
            const minutes = time.getMinutes();
            const seconds = time.getSeconds();

            // Determine whether it's AM or PM
            const period = hours >= 12 ? 'PM' : 'AM';

            // Convert hours to 12-hour format
            const formattedHours = hours % 12 || 12;

            // Format the time string with AM or PM
            const formattedTime = `${formattedHours}:${minutes}:${seconds} ${period}`;

            return `Current time in ${city} is: ${formattedTime}`;
        } else {
            console.error('Error fetching current time data:', data);
            return `I couldn't fetch the time for ${city}.`;
        }
    } catch (error) {
        console.error('Error in getTimeForLocation:', error);
        return `Sorry, I couldn't fetch the time for ${city}.`;
    }
}

function matchesObjectDetectionCommand(command) {
    return objectDetectionCommands.some(pattern => pattern.test(command));
}

function performObjectDetection(imageFile) {
    // Set the 'src' attribute of the 'uploadedImage' element to the URL of the uploaded image
    const uploadedImage = document.getElementById('uploadedImage');
    uploadedImage.src = URL.createObjectURL(imageFile);

    const formData = new FormData();
    formData.append('image', imageFile);

    fetch('https://api.api-ninjas.com/v1/objectdetection', {
        method: 'POST',
        body: formData,
        headers: {
            'X-Api-Key': process.env.API_NINJAS_KEY,
        },
    })
        .then(response => response.json())
        .then(data => {
            if (Array.isArray(data) && data.length > 0) {
                // Process each detected object and create a list
                const detectedObjects = data.map(obj => `${obj.label} (Confidence: ${obj.confidence})`);
                const objectDetectionResult = `Objects detected:\n${detectedObjects.join('\n')}`;
                displayContent(objectDetectionResult);
                speak(objectDetectionResult);
            } else {
                console.error('Invalid object detection response:', data);
                const errorMessage = 'Sorry, no objects were detected in the image or the response is invalid.';
                displayContent(errorMessage);
                speak(errorMessage);
            }
        })
        .catch(error => {
            console.error('Error performing object detection:', error);
            const errorMessage = 'Sorry, an error occurred during object detection.';
            displayContent(errorMessage);
            speak(errorMessage);
        });
}

async function getCryptoPrice(symbol) {
    const url = 'https://api.api-ninjas.com/v1/cryptoprice?symbol=' + symbol;
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'X-Api-Key': process.env.API_NINJAS_KEY },
        });

        const data = await response.json();

        if (data.price) {
            const formattedPrice = parseFloat(data.price).toFixed(3); // Format price to 3 decimal places
            const message = `The current price of ${symbol} is ${formattedPrice}`;
            displayContent(message); // Display the message
            speak(message);
        } else {
            const errorMessage = `Sorry, I couldn't fetch the price for ${symbol}`;
            displayContent(errorMessage); // Display the error message
            speak(errorMessage);
        }
        return;
    } catch (error) {
        console.error('Error fetching crypto price:', error);
        const errorMessage = 'An error occurred while fetching the crypto price.';
        displayContent(errorMessage); // Display the error message
        speak(errorMessage);
        return;
    }
}

function displayMap(lat, lon) {
    // Display the map container
    document.getElementById('map').style.display = 'block';

    const map = L.map('map').setView([lat, lon], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data © <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
        maxZoom: 19,
    }).addTo(map);

    L.marker([lat, lon]).addTo(map)
        .bindPopup('Location here')
        .openPopup();
}

async function getIPLookupData(ip, fields) {
    hideMap();  // Hide the map at the start of the function
    const url = 'https://api.api-ninjas.com/v1/iplookup?address=' + ip;
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'X-Api-Key': process.env.API_NINJAS_KEY },
        });

        const data = await response.json();

        if (data.is_valid) {
            let message;
            if (fields) {
                const extractedData = fields.map(field => {
                    const apiField = field === 'latitude' ? 'lat' : field === 'longitude' ? 'lon' : field; // Convert to API's field name
                    return `${field.charAt(0).toUpperCase() + field.slice(1)}: ${data[apiField] || 'N/A'}`;
                });
                message = `Information for IP ${ip}:\n${extractedData.join(', ')}`;
            } else {
                message = `Information for IP ${ip}:\nCountry: ${data.country}, Region: ${data.region}, City: ${data.city}, Zip: ${data.zip}, Latitude: ${data.lat}, Longitude: ${data.lon}`;
            }
            displayContent(message);  // Display the message
            speak(message);

            // Check if the user asked for latitude and longitude or if no specific fields were requested
            if (!fields || fields.includes('latitude') || fields.includes('longitude')) {
                displayMap(data.lat, data.lon);  // Display the map for the IP's location
            }

        } else {
            const errorMessage = `Sorry, I couldn't fetch information for IP ${ip}`;
            displayContent(errorMessage);  // Display the error message
            speak(errorMessage);
        }
        return;
    } catch (error) {
        console.error('Error fetching IP lookup data:', error);
        const errorMessage = 'An error occurred while fetching IP lookup data.';
        displayContent(errorMessage);  // Display the error message
        speak(errorMessage);
        return;
    }
}

function promptForIP() {
    // Show an input field to allow the user to type an IP address
    const ipInput = document.createElement('input');
    ipInput.setAttribute('id', 'ipInput');
    ipInput.setAttribute('type', 'text');
    ipInput.setAttribute('placeholder', 'Enter IP Address...');

    // Listen for input changes
    ipInput.addEventListener('input', function () {
        if (isValidIP(this.value)) {
            getIPLookupData(this.value);  // Process the IP once it's valid
            this.remove();  // Remove the input field
        }
    });

    document.getElementById('content').appendChild(ipInput);  // Add the input field to the DOM
}

function isValidIP(ip) {
    const ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    return ipPattern.test(ip);
}

// Day/Night Theme Switcher functionality
const themeSwitch = document.getElementById('themeSwitch');

// Determine the default theme based on the initial state of the checkbox
const isDarkTheme = themeSwitch.checked;

// Set the default theme
if (isDarkTheme) {
    document.body.setAttribute('data-theme', 'dark');
}

// Trigger the change event to update the UI
themeSwitch.dispatchEvent(new Event('change'));

themeSwitch.addEventListener('change', function () {
    if (this.checked) {
        document.body.setAttribute('data-theme', 'dark');
    } else {
        document.body.removeAttribute('data-theme');
    }
});

function toggleListening(isListening) {
    const button = document.getElementById('startListening');
    if (isListening) {
        button.classList.add('listening-active');
        button.textContent = "🎙 Now Listening";
        button.style.backgroundColor = "#4CAF50";
    } else {
        button.classList.remove('listening-active');
        button.textContent = "🎙 Start Listening";
        button.style.backgroundColor = "";
    }
}
