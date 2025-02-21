// backgroundscript.js

/**
 * Helper: Promise-based sleep to pause execution for ms milliseconds.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retrieves a cookie value for a given name and URL using the chrome.cookies API.
 * @param {string} name - The cookie name.
 * @param {string} url - The URL from which to retrieve the cookie.
 * @returns {Promise<string>} - Resolves to the cookie value or an empty string.
 */
function getCookie(name, url) {
    return new Promise((resolve) => {
        if (!chrome.cookies) {
            console.error("chrome.cookies API is not available in this context.");
            resolve("");
            return;
        }
        chrome.cookies.get({ url: url, name: name }, (cookie) => {
            if (cookie) {
                resolve(cookie.value);
            } else {
                console.error(`Cookie ${name} not found for ${url}`);
                resolve("");
            }
        });
    });
}

/**
 * Makes an authenticated GET request to the given endpoint using the provided token.
 * @param {string} endpoint - The LinkedIn API endpoint.
 * @param {string} token - The authentication token (from JSESSIONID).
 * @returns {Promise<Object|null>} - Resolves to the JSON response or null on failure.
 */
async function doAjaxCall(endpoint, token) {
    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.linkedin.normalized+json+2.1',
                'Csrf-Token': token,
                'JSESSIONID': token,
                'X-RestLi-Protocol-Version': '2.0.0'
            }
        });
        if (!response.ok) {
            console.error("Error response from endpoint:", response.status);
            return null;
        }
        const data = await response.json();
        return data;
    } catch (err) {
        console.error("Error in doAjaxCall:", err);
        return null;
    }
}

/**
 * Processes a new LinkedIn profile URL by extracting the profile ID, 
 * constructing the API endpoint, and making the API call.
 * @param {string} profileUrl - The LinkedIn profile URL.
 */
async function processLinkedInProfile(profileUrl) {
    console.log("New LinkedIn profile loaded:", profileUrl);

    // Example URL: "https://www.linkedin.com/in/mindofkira/"
    // Split the URL into parts:
    const parts = profileUrl.split("/");
    // We assume that the profile identifier comes immediately after "in"
    const inIndex = parts.findIndex(part => part === "in");
    if (inIndex === -1 || !parts[inIndex + 1]) {
        console.error("Could not extract profile ID from URL:", profileUrl);
        return;
    }
    const profileId = parts[inIndex + 1];
    console.log("Extracted profile ID:", profileId);

    // Pause for 5 seconds to throttle requests (optional)
    await sleep(5000);

    // Build the LinkedIn API endpoint for profile details
    const endpoint = `https://www.linkedin.com/voyager/api/identity/profiles/${profileId}/profileView`;
    console.log("Constructed API endpoint:", endpoint);

    // Retrieve the JSESSIONID token from LinkedIn's cookies
    let token = await getCookie("JSESSIONID", "https://www.linkedin.com");
    token = token.replace(/"/g, ''); // Remove extraneous quotes if present
    console.log("Retrieved token:", token);

    // Make the API call and log the profile data
    const profileData = await doAjaxCall(endpoint, token);
    console.log("Profile data received:", profileData);
}

/**
 * Listen for tab updates and process new LinkedIn profile pages.
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if the tab is fully loaded and the URL matches a LinkedIn profile page.
    if (changeInfo.status === 'complete' && tab.url && tab.url.match(/^https:\/\/www\.linkedin\.com\/in\/.+/)) {
        processLinkedInProfile(tab.url);
    }
});
