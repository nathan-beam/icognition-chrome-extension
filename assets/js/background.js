import { cleanUrl } from './utils.js'
import { firebase } from './firebase/config'

const base_url = 'http://localhost:8889'

const Endpoints = {
    bookmark: '/bookmark',
    document: '/document',
    document_plus: '/document_plus/{ID}',
    user_bookmarks: '/bookmark/user/{ID}'
}


async function postBookmark(tab){
    
    let bookmark = null
    let bm_error = null
    let html = null

    
    function getTitle() { return document.documentElement.innerHTML; }


    try {
        const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: false },
            func: getTitle,
        });

        if (injectionResults[0].result != null) {
            console.log('injection results exist')
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
            }),
        })
        console.log('response: ', response)
        if (response.status == 204) {
            bm_error = 'Page cannot be bookmarked. Missing article text.'
            return {bookmark, error: bm_error}
        }
        if (response.status == 201) {
            bookmark = await response.json()
            return {bookmark, error: bm_error}
        }
    }
    catch (err) {
        bm_error = err
        return {bookmark, error: bm_error}
    }
}

async function postRegenerateDocument(document) {

    console.log('postRegenerateDocument -> document: ', document)
    //Fetch post with request.document
    try {
        let response = await fetch(`${base_url}${Endpoints.document}`, {
            method: 'post',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(document),
        })
        
        console.log('postRegenerateDocument -> response: ', response)
        if (response.status == 202) {
            console.log(`postRegenerateDocument accepted, seding document_ id ${document.id} to renderDocument`)
            renderDocument(document.id)
        }
    }catch (err) {
        console.log('postRegenerateDocument -> error: ', err)
    }

    
}

// Source: https://dev.to/ycmjason/javascript-fetch-retry-upon-failure-3p6g
async function fetch_retry(url, options, n) {
    try {
        const response = await fetch(url, options);
        if (response.status == 206 && n > 1) {
            return fetch_retry(url, options, n - 1);
        } else {
            return response.json();
        }
    } catch (error) {
        throw error;
    }
}

function refreshBookmarksCache() {
    let attempts = 3
    const url = `${base_url}${Endpoints.user_bookmarks.replace('{ID}', 777)}`
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

function renderDocument(document_id) {
    /*
    * Fetch document from server with a retry fetch.
    * The reason for the retry fetch is that the server may not have the document ready while
    * LLM is still processing the document.
    * Send document to side panel to render. 
    */
    
    let attempts = 3
    const url = `${base_url}${Endpoints.document_plus.replace('{ID}', document_id)}`
    const options = { method: 'GET', headers: {'Accept': 'application/json','Content-Type': 'application/json',}}

    console.log('renderDocument -> url: ', url)
    fetch_retry(url, options, attempts).then((document) => {
            console.log('getDocument -> response: ', document)
            sendDocumentToSidePanel(document).then((response) => {          
                console.log('renderDocument -> response: ', response)
            })
            
    })
    .catch((error) => {
        console.log('getDocument -> error: ', error)
        throw error
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
    
    if (typeof new_bookmarks === 'object') new_bookmarks = [new_bookmarks]

    chrome.storage.local.get(["bookmarks"]).then((value) => {
        let bookmarks = value.bookmarks || [];
        bookmarks = Array.from(new Set([...bookmarks, ...new_bookmarks]));
        chrome.storage.local.set({ bookmarks: bookmarks }).then(() => {
            console.log("Bookmarks storage updated");
        });
    });
}

async function getLocalBookmarks() { 
    chrome.storage.local.get(["bookmarks"]).then((value) => {
        return value.bookmarks
    });
}

function searchBookmarksByUrl(url) {
    chrome.storage.local.get(["bookmarks"]).then((value) => {
        return value.bookmarks.find(bookmark => bookmark.url === url);
    });
}


// Detect changes in active tab
chrome.tabs.onActivated.addListener(async (tab) => { 

    console.log('tabs.onActivated', tab.tabId)
    const { path } = await chrome.sidePanel.getOptions({ tabId: tab.tabId });
    console.log('tabs.onActivated -> sidepanel exists: ', path)
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        console.log('tabs onActivated -> query for active tab -> url: ', tabs[0].url)
    });
});


chrome.tabs.onUpdated.addListener(function (tabId , info) {
    if (info.status === 'complete') {
        console.log('Background -> tabs.onUpdated', tabId)
    }
});



chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log('background.js got message. ', request)    
        
        // Handle message from sipde panel
        if (request.name === 'bookmark-page') {
            console.log('background.js got message. Side Panel Opened')
            
            console.log('tabs url: ', request.tab.url)
            postBookmark(request.tab).then((result) => {
                if (result.error) {
                    console.log('onMessage.bookmark-page error: ', result.error)
                    renderError(result.error)
                } else if (!result.error) {
                    storeBookmarks(result.bookmark)
                    console.log('onMessage.bookmark-page url: ', result.bookmark.url)
                    renderDocument(result.bookmark.document_id)
    
                } else {
                    console.log('error: ', result)
                }
            })
        }

        if (request.name === 'regenerate-document') {
            console.log('background.js got message. Regenerate Document')
            postRegenerateDocument(request.document)
        }

        if (request.name === 'request-document') {
            console.log('background.js got message. Request Document')
            renderDocument(request.bookmark.document_id)
        }
    });


chrome.runtime.onInstalled.addListener(() => {
    // Open sidepanel on action button click
    chrome.sidePanel
        .setPanelBehavior({ openPanelOnActionClick: true })
        .catch((error) => console.error(error));
    
    // Initialize bookmark local storage
    chrome.storage.local.clear(function() {
        var error = chrome.runtime.lastError;
        if (error) {
            console.error(error);
        }
        refreshBookmarksCache()
    });
    

}) 