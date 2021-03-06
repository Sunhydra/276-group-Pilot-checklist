/*
Copyright 2018 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/




const container = document.getElementById('container');
initDB()
loadContentNetworkFirst();
bindOnSubmit();
function getServerData() {
  return fetch('api/getChecklist').then(response => {
    if (!response.ok) {
      throw Error(response.statusText);
    }
    return response.json();
  });
}


function updateUI(checklist) {
  let items = '';
  Array.prototype.forEach.call(checklist, checklistItem => {
    const item =
      `<tr><td><input name="${checklistItem.id}" id="yes-${checklistItem.id}" value="yes" type="checkbox" onclick="onlyOne(this)" /></td><td><input name="${checklistItem.id}" id="na-${checklistItem.id}" value="na" type="checkbox" onclick="onlyOne(this)"  /></td><td>${checklistItem.name}</td></tr>`;
      items+=item;
  });

  let template = `<table><thead><tr><td colspan="3">Required Documentation - Universal		</td></tr><tr><td>Yes</td><td>N/A</td><td>Documentation</td></tr></thead><tbody>${items}</tbody></table>`;

  container.insertAdjacentHTML('beforeend', template);

}

function loadContentNetworkFirst() {
  getIndexedDB().then(dataFromNetwork => {
	updateUI(dataFromNetwork);
  });
}

function bindOnSubmit(){
  document.querySelector("#checklistForm").addEventListener("submit", function(e){
    e.preventDefault();
    let formData = new FormData(e.target);
    var object = {};
    formData.forEach(function(value, key){
        object[key] = value;
    });
    console.log(JSON.stringify(object));
    if(Object.keys(object).length>0){
      saveToDB(object);
    }
    else{
      alert('you have to completed the checklist');
    }
  });
}

function onlyOne(checkbox) {
    var checkboxes = document.getElementsByName(checkbox.name);
    checkboxes.forEach((item) => {
        if (item !== checkbox) item.checked = false
    })
}


function initDB(){
  window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  // DON'T use "var indexedDB = ..." if you're not in a function.
  // Moreover, you may need references to some window.IDB* objects:
  window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || {READ_WRITE: "readwrite"}; // This line should only be needed if it is needed to support the object's constants for older browsers
  window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
  if (!window.indexedDB) {
      console.log("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
  }
  var request = window.indexedDB.open("icmd", 1);
  request.onupgradeneeded = function(event) {
    var db = event.target.result;

    // Create an objectStore to hold information about our customers. We're
    // going to use "ssn" as our key path because it's guaranteed to be
    // unique - or at least that's what I was told during the kickoff meeting.
    var objectStore = db.createObjectStore("checklist", { autoIncrement : true });
    var resultStore = db.createObjectStore("checklistResult", { autoIncrement : true });
    const checklistData = [
      {
        "id":1,
        "name": "Landowner/Flight Area Permission Forms On-Hand"
      },
      {
        "id":2,
        "name":"Pilot License On-Hand"
      },
      {
        "id":3,
        "name":"Drone Registraton Certifcate On-Hand - FAA / TC"
      },
      {
        "id":4,
        "name":"Insurance On-Hand"
      },
      {
        "id":5,
        "name":"FLHA and Tailgate Completed"
      },
      {
        "id":6,
        "name":"GPS Coordinates (Lat/Long) Visible for Reference"
      },
      {
        "id":7,
        "name":"Emergency Services Contact Information Visible"
      },
      {
        "id":8,
        "name":"Air Traffic Control and Aerodrome Contact Information Visible"
      }
    ];
    // Create an index to search customers by name. We may have duplicates
    // so we can't use a unique index.
    objectStore.createIndex("name", "name", { unique: false });
    objectStore.createIndex("id", "id", { unique: true });
    resultStore.createIndex("id", "id", { unique: true });

    checklistData.forEach(function(checklist) {
      objectStore.add(checklist);
    });
    // Use transaction oncomplete to make sure the objectStore creation is
    // finished before adding data into it.
    objectStore.transaction.oncomplete = function(event) {
      // Store values in the newly created objectStore.
      var checklistObjectStore = db.transaction("checklist", "readwrite").objectStore("checklist");

    };
  };
}

async function getIndexedDB(){
  return new Promise(function(resolve,reject){
    var openRequest = window.indexedDB.open("icmd", 1);
    openRequest.onsuccess = function() {
      let db = openRequest.result;
      var transaction = db.transaction(["checklist"]);
      var objectStore = transaction.objectStore("checklist");
      var request = objectStore.getAll();
      request.onsuccess = function(event) {
        // Do something with the request.result!
        console.log(request.result);
        resolve(request.result);
      };
      // continue to work with database using db object
    };
  });
}

function saveToDB(formData){
  getMaxID().then(id=> {
    console.log(id);
    let newRecord = {
      "id":id+1,
      "formData": JSON.stringify(formData),
      "date": new Date()
    };
    console.log(newRecord);
    var request = window.indexedDB.open("icmd", 1);
    request.onsuccess = function() {
      let db = request.result;
      var resultStore = db.transaction("checklistResult", "readwrite").objectStore("checklistResult");

      resultStore.add(newRecord);
      resultStore.transaction.oncomplete = function(event) {
        // Store values in the newly created objectStore.
        var resultCLStore = db.transaction("checklistResult", "readwrite").objectStore("checklist");

      };

    };
  });

}

async function getMaxID(){
  return new Promise(function(resolve, reject){
    var openDbRequest = window.indexedDB.open("icmd", 1);
    openDbRequest.onsuccess = function() {
      let db = openDbRequest.result;
      var transaction = db.transaction(["checklistResult"]);
      var store = transaction.objectStore('checklistResult');
      var index = store.index('id');
      var request = index.openCursor(/*query*/null, /*direction*/'prev');
      request.onsuccess = function() {
        var cursor = request.result;
        if (cursor) {
          console.log('max date is: ' + cursor.key);
          resolve(cursor.key);
        } else {
          console.log('no records!');
          resolve(0);
        }
      }
    };
  });
}
