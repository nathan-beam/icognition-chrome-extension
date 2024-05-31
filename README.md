# Dictionary Side panel example

This example allows users to right-click on a word and see the definition on the side panel using the [Side Panel API](https://developer.chrome.com/docs/extensions/reference/sidePanel/).

NOTE: This example only defines the word extensions and popup.

## Running this extension

1. Clone this repository.
2. Load this directory in Chrome as an [unpacked extension](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked).
3. Open the side panel UI
4. Choose the "Dictionary side panel".

<img src="https://wd.imgix.net/image/BhuKGJaIeLNPW9ehns59NfwqKxF2/9QJK3CNx71t67M3MlIUY.png?auto=format&w=385" alt="Dictionary side panel">

5. Go to https://developer.chrome.com/docs/extensions/
6. Right-click on the "Extensions" word.
7. Choose the "Define" context menu

You should see the definition on the side panel

<img src="https://wd.imgix.net/image/BhuKGJaIeLNPW9ehns59NfwqKxF2/aC3zkJDPliNLXdvfugeU.png" alt="Dictionary extension context menu">



## Chrome Developer Dashboard
1. https://chrome.google.com/webstore/developer/dashboard 
2. Register as non-trade for now

Icons link: <a target="_blank" href="https://icons8.com/icon/AqxR8HVzKNDb/info">Info</a> icon by <a target="_blank" href="https://icons8.com">Icons8</a>

## Chrome Extension Authentication
The Chrome extenstion authentication was done using this guide: https://firebaseopensource.com/projects/firebase/quickstart-js/auth/chromextension/readme/
-- Please note that GCP credential and Chrome Store are under the icognition account. 

## Adding users
Because the icognition allow is a public application, it need to go through approval process. For now, users with non icognition account needs to be added here: https://console.cloud.google.com/apis/credentials/consent?project=stg-icognition&supportedpurview=project 

## Todo
1. Get new 128x128 icon for the Chrome store - https://www.fiverr.com/inbox/zera93
2. Improve the concent from in GCP Credential to include privacy statement. 

