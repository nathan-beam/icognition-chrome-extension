async function storeBookmark(url) { 
    chrome.storage.local.get(["bookmarks"]).then((value) => {
        let bookmarks = value.bookmarks
        bookmarks.push(url)
        chrome.storage.local.set({ bookmarks: bookmarks }).then(() => {});
    });
}

async function getStoreBookmarks() { 
    chrome.storage.local.get(["bookmarks"]).then((value) => {
        return value.bookmarks
    });
}


export function cleanUrl(url) {
    url = decodeURIComponent(url);
    // Define the regex
    const pageRegex = /(http.*:\/\/[a-zA-Z0-9:\/\.\-\@\%\_]*)/;

    // Match the regex against the URL
    const matches = url.match(pageRegex);

    // Get the first match
    let cleanUrl;
    if (matches) {
        cleanUrl = matches[0];
    } else {
        // If no match, use the URL as the page URL
        cleanUrl = url;
    }

    return cleanUrl;
}
