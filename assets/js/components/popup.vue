<template>
    <div>        
        <div class="header">
            <img src="images/icognition_logo_sidepanel.png" alt="iCognition Logo"  width="150px">
            <img class="logout_icon" src="images/icons8-logout-48.png" width="35px" alt="Logout" v-if="user !== null" @click="handleSignOut">

        </div>

        <div class="controls">
            <div v-if="user === null" class="button_container">
                <label class="btn"  @click="handleSignIn">Sign using Google</label>
            </div>

            <div v-else class="button_container" >
                <label class="btn" v-if = "!bookmark" @click="handleBookmark">{{ bookmark_status }}</label>
                <label class="btn" style="background-color: green" v-if="bookmark" @click="handleRegenerateDocument">{{ bookmark_status }}</label>       
            </div>
        </div>
        <div v-if="error_bookmark" class="message_container">
            <p class="error">{{ error_bookmark.detail }}</p>
        </div>
        <div v-if="doc_status === 'processing'">
            <p class="loading">Processing...</p>
        </div>

        <div v-if = "doc_status == 'ready' && user != null">
            <div class="answer_container">
                <p>{{document.is_about}}</p>
                <p>The key points are:</p>
                <ul class="" v-for="point in document.tldr">
                    <li>{{ point }}</li>
                </ul>
            </div>
            
        </div>


        <div class="debug">
            <p> 
                bookmark status is: {{ bookmark_status }} 
                bookmark is: {{ bookmark !== null}} 
                server status {{  server_status }}
            </p>
        </div>
    </div>

        
</template>
<script setup>
import { ref, onMounted, watch } from 'vue'
import useAuth from '../composables/useAuth.js';

const { auth_error, user, handleSignIn, handleSignOut } = useAuth()

const bookmark = ref(null)
const server_status = ref(null)
const active_tab = ref(null)
const error_bookmark = ref(null)
const bookmark_status = ref("Add to iCognition")
const doc_status = ref(null)
const document = ref(null)

// Send message to background.js asking if server is running
if (server_status.value === null) {
    chrome.runtime.sendMessage({ name: 'server-is' }).then((response) => {
        console.log('Sidepanel -> server-is', response)
        server_status.value = response.status
    })
}

chrome.tabs.query({ active: true, lastFocusedWindow: true }).then((tabs) => {
    active_tab.value = tabs[0]
})


// Check if user is signed and stored in sesssion storage
chrome.storage.session.get(["session_user"]).then((session_user) => {
    console.log('sidepanel -> user_uid: ', session_user.session_user)
    if (session_user.session_user) {
        user.value = session_user.session_user
    } else {
        console.log('sidepanel -> no user found in session storage!')
    }
});

const checkForBookmarks = async () => {
    console.log('checkForBookmarks -> user:', user.value)
    if (user.value) {
        chrome.runtime.sendMessage({ name: 'check-for-bookmarks', tab: active_tab.value}).then((response) => {
            console.log('checkForBookmarks -> response:', response)
            bookmark.value = response.bookmark
            bookmark_status.value = response.bookmark ? 'Added' : 'Add to iCognition'
        })
    }
}

watch(bookmark, (beforeBookmark, afterBookmark) => {
    console.log('Popup -> bookmark changed: ', bookmark.value.id)
    if (bookmark.value.id) {
        chrome.runtime.sendMessage({ name: 'fetch-document', bookmark_id: bookmark.value.id }).then((response) => {
            console.log('Popup -> fetch-document response:', response)
            if (response.document) {
                document.value = response.document
                doc_status.value = 'ready'
            } else {
                doc_status.value = 'processing'
            }
            
        })
    }
})


// Send message checking for bookmarks from background script
onMounted(async () => {
    console.log('Popup -> onMounted')
    await checkForBookmarks()
});

watch(user, async (beforeUser, afterUser) => {
    console.log('Popup -> user changed: ', user.value)
    if (user.value == null) {
        console.log('Popup -> user is null')
    } else {
        await checkForBookmarks()   
    }
})

//Methods to handle events
const handleBookmark = async () => {
    bookmark_status.value = 'Processing'
    error_bookmark.value = null

    chrome.runtime.sendMessage({name: 'bookmark-page', tab: active_tab.value}).then((response) => {
        console.log('handleBookmark -> response:', response)

        if (response.bookmark) {
            console.log('handleBookmark -> bookmark:', response.bookmark)
            bookmark.value = response.bookmark
            bookmark_status.value = 'Saved'
            doc_status.value = 'processing'
        } else {
            bookmark_status.value = 'error'
            error_bookmark.value = response.error
        }
    })
}

//Regenerate document
const handleRegenerateDocument = async () => {
    doc_status.value = 'processing'
    console.log('handleRegenerateDocument -> document title:', document.value.title)
    let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    chrome.runtime.sendMessage({
            name: 'regenerate-document', tab: tabs[0], document: document.value
        }).then((response) => {
            console.log('handleRegenerateDocument -> response:', response)
        })
}





chrome.runtime.onMessage.addListener(
    async (request, sender, sendResponse) => {
        
        if (request.name === 'error-bookmarking') {
            console.log('error-bookmarking -> request', request)
            doc_status.value = 'error'
            document.value = null
            error_bookmark.value = request.data
            sendResponse({ message: 'bookmark-page recived' })
        }
}); 

</script>