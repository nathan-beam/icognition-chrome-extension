// Copyright 2023 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
var doc_id = ''

chrome.runtime.onMessage.addListener(({ name, data }) => {
  if (name === 'clear-bookmark') {
    
    document.body.querySelector('h1#header').innerText = `Page isn't bookmarked`
    document.body.querySelector('div#bullet-points').style.display = 'none'
    document.body.querySelector('div#concepts').style.display = 'none'
  }

  if (name == 'render-bookmark') {
    console.log(`Sidepanel, render bookmark ${data.bookmark}`)
    const doc = data.bookmark.document
    doc_id = doc.id
    document.body.querySelector('h1#header').innerText = `iCognition Results. Status ${doc.status}`
    
    document.body.querySelector('div#bullet-points').style.display = 'inline'
    document.body.querySelector('h2#bullet-points').innerText = "TLDR:"
    document.body.querySelector('p#bullet-points').innerText = doc.summary_bullet_points ? doc.summary_bullet_points : "No data :("
    
    document.body.querySelector('div#concepts').style.display = 'inline'
    document.body.querySelector('h2#concepts').innerText = "Key Concepts:"
    document.body.querySelector('p#concepts').innerText = doc.concepts_generated ? doc.concepts_generated : "No data :("
    
  }
});


document.getElementById("regenerate").addEventListener("click", regenerate);
async function regenerate(){
    console.log(`Someone ask me to regenerate data for document id ${doc_id}`)
    reponse = await chrome.runtime.sendMessage({
      name: 'regenerate',
      data: { document_id: doc_id }
    })
}