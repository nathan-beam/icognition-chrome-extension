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