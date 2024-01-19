<template>
    <div v-if = "document">
        <h1 class="title">{{document.title}}</h1>
        <p>{{ document.short_summary }}</p>
        <div v-for="point in document.summary_bullet_points" :key="point">
            <p>{{ point }}</p>
        </div>
    </div>
    <div v-if = "!document && !status">
        <button @click="handleBookmark">Bookmark Page</button>
    </div>
    <div v-if = "status === 'loading'">
        <h3>{{ status }}</h3>
    </div>
    <div v-if = "status === 'error'">
        <h3>{{ error_message }}</h3>
    </div>
</template>
<script>
import { ref, onMounted } from 'vue'
//import { storeBookmark, getStoreBookmarks } from '../utils.js'
export default {


    setup() {

        const status = ref(null)
        const document = ref(null)
        const error_message = ref(null)


        //Methods to handle events
        const handleBookmark = async () => {
            status.value = 'loading'
            let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
                chrome.runtime.sendMessage({
                    name: 'bookmark-page', url: tabs[0].url
                }).then((response) => {
                    console.log('response', response)
                })
        }
        
        const searchBookmarksByUrl = (url, sidepanelopen) => {
            status.value = null
            document.value = null
            chrome.storage.local.get(["bookmarks"]).then((value) => {
                const exist = value.bookmarks.find(bookmark => bookmark.url === url)

                if (exist) {
                    console.log('searchBookmarksByUrl -> bookmark found', exist)
                    handleBookmark()
                } else {
                    console.log('searchBookmarksByUrl -> bookmark not found')
                    document.value = ''
                    if(sidepanelopen) {
                        handleBookmark()
                    }
                }

            });
        }

        // On sidepanel open, find the current tab and search for bookmarks.
        // If bookmark found, show the document, less create a new bookmark
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            console.log('Sidepanel -> tabs.query', tabs[0].url)
            searchBookmarksByUrl(tabs[0].url, true)
        });

        

        
        // Detect changes in active tab
        chrome.tabs.onActivated.addListener(async (activeInfo) => { 
            console.log('Sidepanel -> tabs.onActivated', activeInfo.tabId)
            chrome.tabs.get(activeInfo.tabId).then((tab) => {
                console.log('Sidepanel -> tabs.onActivated: ', tab.url)
                searchBookmarksByUrl(tab.url)
            })
        });

        chrome.tabs.onUpdated.addListener(function (tabId , info) {
            if (info.status === 'complete') {
                console.log('Sidepanel -> tabs.onUpdated', tabId)
                chrome.tabs.get(tabId).then((tab) => {
                    console.log('Sidepanel -> tabs.onUpdated: ', tab.url)
                    searchBookmarksByUrl(tab.url)
                })
            }
        });

       
        chrome.runtime.onMessage.addListener(
            function (request, sender, sendResponse) {
                console.log('request', request)
                console.log('sender', sender)    
                if (request.name === 'render-document') {
                    document.value = request.data.document
                    status.value = null
                    console.log('render document', request.data)
                    sendResponse({ message: 'document recived' })
                }
                if (request.name === 'error-bookmarking') {
                    status.value = 'error'
                    error_message.value = request.data
                    sendResponse({ message: 'bookmark-page recived' })
                }
            });


        
        return { document, status, handleBookmark, error_message }

    }
}
</script>
<style>
    
</style>