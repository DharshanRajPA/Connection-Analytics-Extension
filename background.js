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

async function processLinkedInProfile(profileUrl) {
    console.log("New LinkedIn profile loaded:", profileUrl);
    //Example URL: "https://www.linkedin.com/in/mindofkira/"
    const parts = profileUrl.split("/");
    const inIndex = parts.findIndex(part => part === "in");
    if (inIndex === -1 || !parts[inIndex + 1]) {
        console.error("Could not extract profile ID from URL:", profileUrl);
        return;
    }
    const profileId = parts[inIndex + 1];
    console.log("Extracted profile ID:", profileId);
    //throtling
    await sleep(5000);
    const endpoint = `https://www.linkedin.com/voyager/api/identity/profiles/${profileId}/profileView`;
    console.log("Constructed API endpoint:", endpoint);
    let token = await getCookie("JSESSIONID", "https://www.linkedin.com");
    token = token.replace(/"/g, '');
    console.log("Retrieved token:", token);
    const profileData = await doAjaxCall(endpoint, token);
    console.log("Profile data received:", profileData);
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.match(/^https:\/\/www\.linkedin\.com\/in\/.+/)) {
        processLinkedInProfile(tab.url);
    }
});
