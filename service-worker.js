// Utilities methods
async function postData(url = "", data = {}) {
  // Default options are marked with *
  try {
    const response = await fetch(url, {
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      mode: "cors", // no-cors, *cors, same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      credentials: "same-origin", // include, *same-origin, omit
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "follow", // manual, *follow, error
      referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: JSON.stringify(data), // body data type must match "Content-Type" header
    });
    return response;
  } catch(error) {
    console.log(error);
  }   
}

async function getData(url = "") {
  // Default options are marked with *
  try {
    const response = await fetch(url, {
      method: "GET", // *GET, POST, PUT, DELETE, etc.
      mode: "cors", // no-cors, *cors, same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      credentials: "same-origin", // include, *same-origin, omit
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "follow", // manual, *follow, error
      referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    });
    return response
  } catch(error) {
    console.log(error);
  }
    
}



// Chrome extension action button to create bookmars and retrieve document
chrome.action.onClicked.addListener(async function () {
  const tab = await getCurrentTab()
  if(tab.url) {
    response = await postData("http://localhost:8889/bookmark", {url: tab.url})
    if(response.status == 201){
      bookmark = await response.json()
      console.log(`Action onClick - bookmark: ${bookmark}`)
      retrieveBookmarkDoc(bookmark, tab, "onClick -> Bookmark created")
    }else if (response.status == 204){
      console.warn(`Action onClick Bookmark wasn't created`)
    }
    
  }else{
    console.log("No tab url")
  }
  console.log(`Hello from action button. Tab is ${tab.url}`)
});



// chrome.tabs.onActivated.addListener(checkForBookmark);

chrome.tabs.onActivated.addListener( function (activeInfo) {
  checkForBookmark(activeInfo.tabId)
})


chrome.tabs.onUpdated.addListener( function (tabId, changeInfo, tab) {
  if (changeInfo.status == 'complete') {
    checkForBookmark(tabId)
  }
})

async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

// Clear the side panel
async function clearSidePanel() {

  //Send message to clear side panel from bookmark
  try {
    reponse = await chrome.runtime.sendMessage({
    name: 'clear-bookmark',})
  } catch(error){
    console.log(`ClearSidePanel, error sending message ${error}`)
  }

}

async function sendDocToSidePanel(bookmark, status = "Done") {
  //Send message to side panel to render bookmark
  try {
    reponse = await chrome.runtime.sendMessage({
      name: 'render-bookmark',
      data: { bookmark: bookmark, status: status }
    })
  } catch(error){
    console.log(`Render Bookmark, error sending message ${error}`)
  }
}


// Retrieve the document associated with bookmark
async function retrieveBookmarkDoc(bookmark, origin_tab, sender, retries = 0) {

  // If origin tab and current tab are different don't continue
  console.log(`retrieveBookmarkDoc was initiated from ${sender}`)
  const current_tab = await getCurrentTab()
  if(origin_tab.id !== current_tab.id){
    console.log("Origin tab doesn't match current tab")
    return
  }

  console.log(`Render bookmark, bookmark id: ${bookmark.id}. Number of retries: ${retries}`)
  
  response = await getData(`http://localhost:8889/bookmark/${bookmark.id}/document`)

  // If document is still in processing, wait for 
  if(response.status == 206 && retries <= 6){
    console.log(`Retrieve bookmark document status is Processing. Number of retries: ${retries}`)
    bookmark.document = await response.json()
    sendDocToSidePanel(bookmark, origin_tab, "Processing")
    
    // Increase sleep time as the number of retry increase
    retries += 1
    sleep_time = 10000
    if(retries > 3) {
      sleep_time = 30000
    }
    console.log(`Document have partial data, sleeping for ${sleep_time}`)
    setTimeout(retrieveBookmarkDoc, sleep_time, bookmark, origin_tab, "setTimeout", retries)
  } else if (response.status == 206 && retries > 6) {
    // Give up :(
    console.log(`Retrieve bookmark document is taking too long. Number of retries: ${retries}`)
    sendDocToSidePanel(bookmark, origin_tab, "Processing Not Complete")
  }

  // If everything worked as expected
  if(response.status == 200){
    bookmark.document = await response.json()
    console.log("Render bookmark, adding document to bookmark: " + bookmark)
    sendDocToSidePanel(bookmark, origin_tab, "Done")
  }else{
    console.log(`Render bookmark, response status from get document ${response.status}`)
  }

}

async function checkForBookmark(tabId) {
  try {
    console.log(`On Activated: tab id is ${tabId}`)
    const tab = await chrome.tabs.get(tabId)
    console.log(`On Activated: tab url is ${tab.url}`);
    params = new URLSearchParams({url: tab.url})
    response = await getData(`http://localhost:8889/bookmark?${params}`)
    if(response.status == 200){
      console.log(`Bookmark found for url: ${tab.url}`)
      bookmark = await response.json()
      retrieveBookmarkDoc(bookmark, tab, "checkForBookmark")
    }else{
      console.log(`Get Bookmark response status ${response.status}`)
      clearSidePanel()
    }
  } catch (error) {
    console.log(error);
  }
}

function setupContextMenu() {
  chrome.contextMenus.create({
    id: 'define-word',
    title: 'Define',
    contexts: ['selection']
  });
}

chrome.runtime.onMessage.addListener(({ name, data }) => {
  if (name === 'regenerate') {
     console.log(`Received message to regenerate document id ${data.document_id}`)
     regenerateDocument(data.document_id) 
  }
})

async function regenerateDocument(document_id){
  tab = await getCurrentTab()
  console.log(`Regenerate document. Document ID ${document_id}. URL: ${tab.url}`)
}