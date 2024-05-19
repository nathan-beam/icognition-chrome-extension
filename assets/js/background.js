import { cleanUrl } from './utils.js'
import { firebase } from './firebase/config'

const base_url = process.env.MIX_BASE_URL // 'https://icognition-api-scv-mheo5yycwa-uc.a.run.app' //'http://localhost:8889'
console.log('base_url: ', base_url)

const Endpoints = {
    ping: '/ping',
    bookmark: '/bookmark',
    regenrate: '/document/regenerate',
    document_plus: '/document_plus/{ID}',
    user_bookmarks: '/bookmarks/user/{ID}',
    user_bookmark: '/bookmark/user'
}
//Global variables to store current page received from content script. 
let current_page = null


chrome.storage.onChanged.addListener((changes, namespace) => {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
        
        // Listen to update to session_user (login) to refresh the bookmarks cache
        if (key === 'session_user') {
            console.log("session_user changed: ", newValue.uid)
            refreshBookmarksCache(newValue.uid)
        }
    }
});

async function postBookmark(tab){
    
    let bookmark = null
    let bm_error = null
    let html = null


    const session_user = await chrome.storage.session.get(["session_user"])
    console.log('postBookmark -> user: ', session_user.session_user)


    //If no authproof, return error
    if (!session_user.session_user) {
        bm_error = 'User not authenticated'
        return {bookmark, error: bm_error}
    }

    function getBody() { return document.documentElement.innerHTML; }


    try {
        const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: false },
            func: getBody,
        });

        if (injectionResults[0].result != null) {
            console.log('postBookmark -> HTML recieved from content script')
            html = injectionResults[0].result
        }
    } catch (error) {
        //If error, log error and continue without the html
        console.log('postBookmark error executing script: ', error)
    }
    

    try {
        let response = await fetch(`${base_url}${Endpoints.bookmark}`, {
            method: 'post',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: tab.url,
                html: html, 
                user_id: session_user.session_user.uid
            }),
        })
        console.log('postBookmark -> response: ', response)
        if (response.status == 400) {
            bm_error = await response.json()
            console.log('postBookmark -> error: ', bm_error)
            return {bookmark, error: bm_error}
        }
        if (response.status == 201) {
            const bookmark = await response.json()
            return {bookmark, error: null}
        }
    }
    catch (err) {
        const bm_error = err
        return {bookmark, error: bm_error}
    }
}

async function postRegenerateDocument(document){

    console.log('postRegenerateDocument -> document: ', document)
    //Fetch post with request.document
    try {
        let response = await fetch(`${base_url}${Endpoints.regenrate}`, {
            method: 'post',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(document),
        })
        
        console.log('postRegenerateDocument -> response: ', response)
        if (response.status == 202) {
            let bookmark = await response.json()
            console.log(`postRegenerateDocument accepted, seding bookmark_id ${bookmark.id} to renderDocument`)
            renderDocument(bookmark.id)
        }
    }catch (err) {
        console.log('postRegenerateDocument -> error: ', err)
    }

    
}

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

// Source: https://dev.to/ycmjason/javascript-fetch-retry-upon-failure-3p6g
async function fetch_retry(url, options, n) {
    try {
        const response = await fetch(url, options);
        console.log('fetch_retry -> attempts: ', n, ' url: ', url)
        if (response.status == 206 && n > 1) {
            await sleep(1500);
            console.log('fetch_retry -> retrying attempts: ', n, ' url: ', url)
            return fetch_retry(url, options, n - 1);
        } else if (response.status == 206 && n == 1) {
            throw new Error('Failed to fetch: ' + url);
        }
        else {
            return response.json();
        }
    } catch (error) {
        throw error;
    }
}

const searchServerBookmarksByUrl = async (user_id, url) => {
    try {
        let response = await fetch(`${base_url}${Endpoints.user_bookmark}`, {
            method: 'post',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: url,
                html: "",
                user_id: user_id
            }),
        })
        console.log('search bookmark -> response: ', response)
        if (response.status == 404) {
            const bm_error = await response.json()
            console.log('postBookmark -> error: ', bm_error)
            return { bookmark, error: bm_error }
        }
        if (response.status == 200) {
            const bookmark = await response.json()
            return { bookmark, error: null }
        }
    }
    catch (err) {
        return { bookmark, error: err }
    }
}




function refreshBookmarksCache(user_uid) {
    let attempts = 3
    const url = `${base_url}${Endpoints.user_bookmarks.replace('{ID}', user_uid)}`
    const options = { method: 'GET', headers: {'Accept': 'application/json','Content-Type': 'application/json',}}

    console.log('refreshBookmarksCache -> url: ', url)
    fetch_retry(url, options, attempts)
        .then((bookmarks) => {
        console.log('refreshBookmarksCache -> response: ', bookmarks)
        storeBookmarks(bookmarks)
    })
    .catch((error) => {
        console.log('refreshBookmarksCache -> error: ', error)
        throw error
    })
}

const fetchDocument = async (bookmark_id) => {
    let attempts = 30
    const url = `${base_url}${Endpoints.document_plus.replace('{ID}', bookmark_id)}`
    const options = { method: 'GET', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', } }
    
    try {
        const document = await fetch_retry(url, options, attempts)
        return document
    } catch (error){
        console.log('fetchDocument -> error: ', error)
        return null
    }

}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.name === 'fetch-document') {
        console.log('background.js got message. Fetch Document for bookmark_id: ', request.bookmark_id)
        fetchDocument(request.bookmark_id).then((doc) => {
            console.log('fetchDocument 1 -> response: ', doc)
            sendResponse({ document: doc })
        })
    }

})




function renderDocument(bookmark_id) {
    /*
    * Fetch document from server with a retry fetch.
    * The reason for the retry fetch is that the server may not have the document ready while
    * LLM is still processing the document.
    * Send document to side panel to render. 
    */
    
    let attempts = 30
    const url = `${base_url}${Endpoints.document_plus.replace('{ID}', bookmark_id)}`
    const options = { method: 'GET', headers: {'Accept': 'application/json','Content-Type': 'application/json',}}

    fetch_retry(url, options, attempts).then((document) => {
        console.log('getDocument -> response: ', document)
        console.timeEnd('getDocument')
            sendDocumentToSidePanel(document).then((response) => {          
                console.log('renderDocument -> response: ', response)
            })
            
    })
    .catch((error) => {
        console.log('getDocument -> error: ', error)
        renderError(error)
    })
}

const renderError = (error) => {

    chrome.runtime.sendMessage({
        name: 'error-bookmarking',
        data: error,
    }).then((response) => {
        console.log('error-bookmarking response: ', response)
    })

}


async function sendDocumentToSidePanel(document) {
    
    // Send message to side panel to render bookmark
    try {
        let response = await chrome.runtime.sendMessage({
            name: 'render-document',
            data: document,
        })
        return response
    } catch (error) {
        console.log(`Render Bookmark, error sending message ${error}`)
    }
}

 
async function storeBookmarks(new_bookmarks) { 
    
    if (!Array.isArray(new_bookmarks)) new_bookmarks = [new_bookmarks]
    console.log('storeBookmarks -> new_bookmarks: ', new_bookmarks)
    chrome.storage.local.get(["bookmarks"]).then((value) => {
        let bkmks = value.bookmarks || [];
        bkmks = Array.from(new Set([...bkmks, ...new_bookmarks]));
        chrome.storage.local.set({ bookmarks: bkmks }).then(() => {
            console.log("Bookmarks storage updated", bkmks);
        });
    });  // chrome.storage.local.set({ 'https://www.thecurrent.com/what-the-tech-open-internet': 'something to store'})
}


async function searchBookmarksByUrl(url) {
    const value = await chrome.storage.local.get(["bookmarks"]);
    console.log('searchBookmarksByUrl -> value: ', value)
    if (!value.bookmarks && session_user != undefined) {
        console.log('searchBookmarksByUrl -> no bookmarks found in local storage, calling server')
        const session_user = await chrome.storage.session.get(["session_user"])
        const bookmark = await searchServerBookmarksByUrl(session_user.session_user.uid, url)
        return bookmark
    } else {
        const found = value.bookmarks.find(bookmark => bookmark.url == cleanUrl(url));
        return found
    }
}

const badgeOn = (tabId) => {
    chrome.action.setBadgeBackgroundColor(
        {color: 'rgba(22, 169, 32, 1)'},  // Also green
        () => { /* ... */ },
    );     
    chrome.action.setBadgeText({ text: '✔' , tabId: tabId });
}

const badgeOff = (tabId) => {     
    chrome.action.setBadgeText({ text: null , tabId: tabId });
}

const badgeToggle = async (tab) => {
    
    console.log('badgeToggle -> url: ', tab.url)
    const bookmark = await searchBookmarksByUrl(tab.url)
    if (bookmark != undefined) {
        console.log('tabs.onActivated -> found: ', bookmark)
        badgeOn(tab.tabId)
    } else {
        console.log('tabs.onActivated -> bookmark not found')
        badgeOff(tab.tabId)
    }
}


// Detect changes in active tab
chrome.tabs.onActivated.addListener(async (tab) => { 

    console.log('tabs.onActivated', tab.tabId)

    chrome.tabs.get(tab.tabId, async (tab) => {
        console.log('tabs.onActivated -> get tab -> url: ', tab.url)
        badgeToggle(tab)
    })

    
});


chrome.tabs.onUpdated.addListener(function (tabId , info) {
    if (info.status === 'complete') {
        
        chrome.tabs.get(tabId, async (tab) => {
            console.log('tabs.onUpdated -> get tab -> url: ', tab.url)
            badgeToggle(tab)
        })
    }
});



chrome.runtime.onMessage.addListener((request, sender, sendResponse) => { 
    if (request.name === 'server-is') {
        console.log('background.js got message. Server is')
        fetch_retry(`${base_url}/ping`, { method: 'GET', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', } }, 3)
            .then((response) => {
                sendResponse({ status: 'up' })

            }).catch((error) => {
                sendResponse({ status: 'down' })
            })

    }
    return true
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.name === 'check-for-bookmarks') {
        
        console.log('popup-opened -> query for active tab id:', request.tab.id, ' -> url: ', request.tab.url)
        searchBookmarksByUrl(request.tab.url).then((bookmark) => {
            if (bookmark != undefined) {
                console.log('popup-opened -> found: ', bookmark)
                sendResponse({ bookmark: bookmark })
            } else {
                console.log('popup-opened -> bookmark not found')
            }
        })
        
    }

});

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {    
        
        // Handle message from sipde panel
        if (request.name === 'bookmark-page') {
            console.log('background.js got message. Bookmark Page for url: ', request.tab.url)
                
                postBookmark(request.tab).then((result) => {
                    if (result.error) {

                        console.log('onMessage.bookmark-page error: ', result.error)
                        sendResponse({ error: result.error })
                    
                    } else if (!result.error) {

                        storeBookmarks(result.bookmark)
                        console.log('onMessage.bookmark-page url: ', result.bookmark.url)
                        badgeOn(request.tab.id)
                        sendResponse({ bookmark: result.bookmark })
                        
                    } else {
                        console.log('error: ', result)
                    }
                })
            
        }

        if (request.name === 'regenerate-document') {
            console.log('background.js got message. Regenerate Document')
            postRegenerateDocument(request.document)
        }
    });


chrome.runtime.onInstalled.addListener(() => {
    // Open sidepanel on action button click
    
    
    // Initialize bookmark local storage
    chrome.storage.local.clear(function() {
        var error = chrome.runtime.lastError;
        if (error) {
            console.error(error);
        }
    });
    

}) 