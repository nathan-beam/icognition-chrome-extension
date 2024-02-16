<template>
    <div class="container">
        <div class="controls">
            <div v-if="user === null" class="auth">
                <label class="btn"  @click="signIn">Sign to Google</label>
            </div>

            <div v-else class="bookmark_button" >
                <label class="btn" v-if = "!document" @click="handleBookmark">Save</label>
                <label class="btn" v-if = "status == 'Done'" @click="handleRegenerateDocument">Regenerate</label>
                <label class="btn" v-if = "status == 'Failure'" @click="handleRegenerateDocument">Regenerate</label>
                <label class="btn" v-if="user !== null" @click="signOut">{{ user.displayName }}</label>
            </div>
        </div>
        
        <div v-if = "status === 'Done'">
            <h1 class="title">{{document.title}}</h1>
            <p>{{ document.short_summary }}</p>
            <div v-for="point in document.summary_bullet_points" :key="point">
                <p>{{ point }}</p>
            </div>
        </div>

        <div class="debug">
            <p> the status is: {{ status }} and document is: {{ document !== null}}</p>
            <div v-if = "status === 'loading'">
                <h3>{{ status }}</h3>
            </div>
            <div v-if = "status === 'error'">
                <h3>{{ error_message }}</h3>
            </div>
        </div>
    </div>
</template>
<script>
import { ref, onMounted } from 'vue'
import { cleanUrl } from '../utils.js'
import { firebase, auth, signOut, signInWithCredential, GoogleAuthProvider } from '../firebase/config'
export default {
                
    setup() {

        const status = ref(null)
        const document = ref(null)
        const error_message = ref(null)
        const user = ref(null)


        const signIn = function(e) {
            e.preventDefault()
            console.log('before signed in user -> ', auth.currentUser)
            chrome.identity.getAuthToken({ interactive: true }, token =>
            {
            if ( chrome.runtime.lastError || ! token ) {
                console.log(`SSO ended with an error: ${JSON.stringify(chrome.runtime.lastError)}`)
                return
            }

            signInWithCredential(auth, GoogleAuthProvider.credential(null, token))
                .then(res =>
                {
                    user.value = auth.currentUser
                    console.log('signed in user -> ', auth.currentUser)
                })
                .catch(err =>
                {
                console.log(`SSO ended with an error: ${err}`)
                })
            })
        }

        const signOut = function () {
            
            auth.signOut().then(() => {
                console.log('signed out! user: ', auth.currentUser)
                user.value = null
            }).catch((error) => {
            console.error('error signing out: ', error)
            });
        }



        //Methods to handle events
        const handleBookmark = async () => {
            status.value = 'loading'
            let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })

            chrome.runtime.sendMessage({
                name: 'bookmark-page', tab: tabs[0]
            }).then((response) => {
                console.log('handleBookmark -> response:', response)
            })
        }

        // Request document from the server
        const handleRequestDocument = async (bookmark_obj) => {
            status.value = 'loading'
            
            chrome.runtime.sendMessage({
                name: 'request-document', bookmark: bookmark_obj
            }).then((response) => {
                console.log('handleRequestDocument -> response:', response)
            })
        }


        //Regenerate document
        const handleRegenerateDocument = async () => {
            status.value = 'loading'
            let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
                chrome.runtime.sendMessage({
                    name: 'regenerate-document', tab: tabs[0], document: document.value
                }).then((response) => {
                    console.log('handleRegenerateDocument -> response:', response)
                })
        }


        //Searach chorome storage for bookmarks by url
        const searchBookmarksByUrl = (tab, sidepanelopen) => {
            status.value = null
            document.value = null
            chrome.storage.local.get(["bookmarks"]).then((value) => {

                //If value is empty, return
                if (Object.keys(value).length === 0 && value.constructor === Object) {
                    console.log('searchBookmarksByUrl -> bookmarks is empty')
                    return
                }
                console.log('searchBookmarksByUrl -> tab:', tab)
                const url = cleanUrl(tab.url)
                const exist = value.bookmarks[0].find(bookmark => bookmark.url === url)

                if (exist) {
                    console.log('searchBookmarksByUrl -> bookmark found', exist)
                    handleRequestDocument(exist)
                } else {
                    console.log('searchBookmarksByUrl -> bookmark not found')
                    document.value = null
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
            searchBookmarksByUrl(tabs[0], true)
        });

        

        
        // Detect changes in active tab and navigation between tabs
        chrome.tabs.onActivated.addListener(async (activeInfo) => { 
            console.log('Sidepanel -> tabs.onActivated', activeInfo.tabId)
            chrome.tabs.get(activeInfo.tabId).then((tab) => {
                console.log('Sidepanel -> tabs.onActivated: ', tab.url)
                searchBookmarksByUrl(tab)
            })
        });
        // Detect tab refresh
        chrome.tabs.onUpdated.addListener(function (tabId , info) {
            if (info.status === 'complete') {
                console.log('Sidepanel -> tabs.onUpdated', tabId)
                chrome.tabs.get(tabId).then((tab) => {
                    console.log('Sidepanel -> tabs.onUpdated: ', tab.url)
                    searchBookmarksByUrl(tab)
                })
            }
        });

       
        chrome.runtime.onMessage.addListener(
            function (request, sender, sendResponse) {
                
                if (request.name === 'render-document') {
                    document.value = request.data.document
                    status.value = document.value.status
                    console.log('render document', request.data)
                    sendResponse({ message: 'document recived' })
                }
                if (request.name === 'error-bookmarking') {
                    console.log('error-bookmarking -> request', request)
                    console.log('error-bookmarking -> request', document.value)
                    status.value = 'error'
                    document.value = null
                    error_message.value = request.data
                    sendResponse({ message: 'bookmark-page recived' })
                }
        }); 
       
        return { document, status, handleBookmark, handleRegenerateDocument, error_message, signIn, signOut, user}

    }
}
</script>