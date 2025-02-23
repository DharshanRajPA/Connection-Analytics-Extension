// backgroundscript.js
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

function getAllCookies(url) {
    return new Promise((resolve) => {
        if (!chrome.cookies) {
            console.error("chrome.cookies API is not available in this context.");
            resolve("");
            return;
        }
        chrome.cookies.getAll({ url: url }, (cookies) => {
            if (cookies && cookies.length) {
                const cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join("; ");
                resolve(cookieHeader);
            } else {
                console.error("No cookies found for", url);
                resolve("");
            }
        });
    });
}

async function doAjaxCall(endpoint, token, cookieHeader) {
    console.log("doAjaxCall: Endpoint:", endpoint);
    console.log("doAjaxCall: Token:", token);
    console.log("doAjaxCall: Cookie Header:", cookieHeader);
    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.linkedin.normalized+json+2.1',
                'Csrf-Token': token,
                'JSESSIONID': token,
                'Cookie': cookieHeader,
                'X-RestLi-Protocol-Version': '2.0.0'
            }
        });
        console.log("doAjaxCall: HTTP status", response.status);
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

async function processLinkedInProfile(profileUrl) {
    console.log("New LinkedIn profile loaded:", profileUrl);
    // Example URL: "https://www.linkedin.com/in/mindofkira/"
    const parts = profileUrl.split("/");
    const inIndex = parts.findIndex(part => part === "in");
    if (inIndex === -1 || !parts[inIndex + 1]) {
        console.error("Could not extract profile ID from URL:", profileUrl);
        return;
    }
    const profileId = parts[inIndex + 1];
    console.log("Extracted profile ID:", profileId);
    // Throttle the request
    await sleep(5000);
    const endpoint = `https://www.linkedin.com/voyager/api/identity/profiles/${profileId}/profileView`;
    console.log("Constructed API endpoint:", endpoint);
    let token = await getCookie("JSESSIONID", "https://www.linkedin.com");
    token = token.replace(/"/g, '');
    if (!token) {
        console.error("Failed to retrieve JSESSIONID token. Aborting request.");
        return;
    }
    console.log("Retrieved token:", token);
    let cookieHeader = await getAllCookies("https://www.linkedin.com");
    if (!cookieHeader) {
        console.error("Failed to retrieve any cookies. Aborting request.");
        return;
    }
    console.log("Constructed cookie header:", cookieHeader);
    const profileData = await doAjaxCall(endpoint, token, cookieHeader);
    console.log("Profile data received:", profileData);
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (
        changeInfo.status === 'complete' &&
        tab.url &&
        tab.url.match(/^https:\/\/www\.linkedin\.com\/in\/.+/)
    ) {
        processLinkedInProfile(tab.url);
    }
});
