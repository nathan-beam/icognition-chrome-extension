import { ref } from 'vue'
import { auth, signInWithCredential, GoogleAuthProvider } from '../firebase/config.js'

const auth_error = ref(null)
const user = ref(null)


// Handle user signin
const handleSignIn = (e) => {
    
    e.preventDefault()
    console.log('before signed in user -> ', auth.currentUser)
    
    chrome.identity.getAuthToken({ interactive: true }, token => {
        if ( chrome.runtime.lastError || ! token ) {
            console.log(`SSO ended with an error: ${JSON.stringify(chrome.runtime.lastError)}`)
            return
        }
        signInWithCredential(auth, GoogleAuthProvider.credential(null, token)).then(res =>
            {
                user.value = auth.currentUser
                auth_error.value = null
                console.log('signed in user -> ', auth.currentUser)
                chrome.storage.session.remove('session_user')
                chrome.storage.session.set({ session_user: auth.currentUser }).then(() => {
                    console.log("signIn => authproof saved!");
                });
            }).catch(err => {
                console.log(`SSO ended with an error: ${err}`)
            })
        })
}
const handleSignOut = () => {
    
    auth.signOut().then(() => {
        console.log('signed out! user: ', auth.currentUser)
        chrome.storage.session.remove('session_user')
        user.value = null
    }).catch((error) => {
    console.error('error signing out: ', error)
    });
}

const useAuth = () => { return { auth_error, user, handleSignIn, handleSignOut } }

export default useAuth