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
    console.log("doAjaxCall: Endpoint:", endpoint);
    console.log("doAjaxCall: Token:", token);
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
        const text = await response.text();
        if (!text.trim()) {
            console.error("Empty response text received.");
            return null;
        }
        try {
            const data = JSON.parse(text);
            return data;
        } catch (jsonErr) {
            console.error("JSON parse error. Raw response:", text);
            return null;
        }
    } catch (err) {
        console.error("Error in doAjaxCall:", err);
        return null;
    }
}

function filterProfileData(data) {
    if (!data) return {};
    return {
        entityUrn: data.included[0].entityUrn.split(':')[data.included[0].entityUrn.split(':').length - 1] || "",
        firstName: data.included[0].firstName || "",
        lastName: data.included[0].lastName || "",
        premiumSubscriber: data.data.premiumSubscriber || false,
        plainId: data.data.plainId || "",
        trackingId: data.included[0].trackingId || "",
        publicIdentifier: data.included[0].publicIdentifier || ""
    };
}

async function processLinkedInProfile(profileUrl) {
    console.log("LinkedIn page loaded:", profileUrl);
    await sleep(5000);

    const endpoint = `https://www.linkedin.com/voyager/api/me`;
    console.log("Constructed API endpoint:", endpoint);

    let token = await getCookie("JSESSIONID", "https://www.linkedin.com");
    token = token.replace(/"/g, '');
    if (!token) {
        console.error("Failed to retrieve JSESSIONID token. Aborting request.");
        return;
    }

    const cookieHeader = `JSESSIONID=${token}`;
    console.log("Constructed cookie header:", cookieHeader);

    const meData = await doAjaxCall(endpoint, token, cookieHeader);
    console.log("Raw API /me data received:", meData);

    const filteredData = filterProfileData(meData);
    console.log("Filtered Profile Data:", filteredData);

    if (chrome.storage.local.profileData != filteredData) {
        chrome.storage.local.set({ profileData: filteredData }, () => {
            console.log("Profile data stored in chrome.storage.local");
        })
    }

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
