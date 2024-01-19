<template>
    <div v-if="document">
        <h1 class="title">{{document.title}}</h1>
        <p>{{ document.short_summary }}</p>
        <div v-for="point in document.summary_bullet_points" :key="point">
            <p>{{ point }}</p>
        </div>
    </div>
    <div v-else>
        <button @click="handleBookmark">Bookmark Page</button>
        <p>{{ status }}</p>
    </div>
</template>
<script>
import { ref, onMounted } from 'vue'
//import { storeBookmark, getStoreBookmarks } from '../utils.js'
export default {


    setup() {

        const status = ref('loading')
        const document = ref('')


        //Methods to handle events
        const handleBookmark = async () => {

        let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
            chrome.runtime.sendMessage({
                name: 'bookmark-page', url: tabs[0].url
            }).then((response) => {
                console.log('response', response)
            })
        }
        
        const searchBookmarksByUrl = (url) => {
            chrome.storage.local.get(["bookmarks"]).then((value) => {
                const exist = value.bookmarks.find(bookmark => bookmark.url === url)

                if (exist) {
                    console.log('searchBookmarksByUrl -> bookmark found', exist)
                    handleBookmark()
                } else {
                    console.log('searchBookmarksByUrl -> bookmark not found')
                    document.value = ''
                }

            });
        }
        

        

        
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

        chrome.storage.onChanged.addListener((changes, namespace) => {
            console.log('storage.onChanged', changes)
            for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
                console.log(
                    `Storage key "${key}" in namespace "${namespace}" changed.`,
                    `Old value was "${oldValue}", new value is "${newValue}".`
                );
            }
        });

        chrome.runtime.onMessage.addListener(
            function (request, sender, sendResponse) {
                console.log('request', request)
                console.log('sender', sender)    
                if (request.name === 'render-document') {
                    document.value = request.data.document
                    console.log('render document', request.data)
                    sendResponse({ message: 'document recived' })
                }
            });


        
        return { document, status, handleBookmark }

    }
}
</script>
<style>
    
</style>