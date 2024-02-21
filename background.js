const CHECK_NUM = 10;
var currentSearch = "";

// var db;
var words_dict = {};

async function storeWords() {
  // type should be 'localStorage'
  console.log("storeWords: Start");

  var Arr_wordsFoodnames = [];
  var Arr_wordsFoodnamesEng = [];
  var Arr_wordsYouTubeTitles = [];

  const URL_wordsFoodnames = chrome.runtime.getURL("words_kor_foodnames");
  const URL_wordsYouTubeTitles = chrome.runtime.getURL("words_YouTube_title");
  const URL_wordsFoodnamesEng = chrome.runtime.getURL("words_eng_foodnames");

  // Fetch word files
  await fetch(URL_wordsFoodnames)
    .then()
    .then((response) =>
      response.text().then(function (text) {
        Arr_wordsFoodnames = Arr_wordsFoodnames.concat(text.split("\n"));
      })
    );
  await fetch(URL_wordsFoodnamesEng)
    .then()
    .then((response) =>
      response.text().then(function (text) {
        Arr_wordsFoodnamesEng = Arr_wordsFoodnamesEng.concat(text.split("\n"));
      })
    );
  await fetch(URL_wordsYouTubeTitles)
    .then()
    .then((response) =>
      response.text().then(function (text) {
        Arr_wordsYouTubeTitles = Arr_wordsYouTubeTitles.concat(
          text.split("\n")
        );
      })
    );
  console.log("storeWords: Finish fetching");

  // Store words to DB
  Arr_wordsFoodnames.forEach(function (foodname) {
    var keyVal = foodname.replace("\r", "");
    var obj = { keyword: keyVal };
    words_dict[keyVal] = keyVal;
  });
  Arr_wordsFoodnamesEng.forEach(function (foodname) {
    var keyVal = foodname.replace("\r", "");
    var obj = { keyword: keyVal };
    words_dict[keyVal] = keyVal;
  });
  Arr_wordsYouTubeTitles.forEach(function (title) {
    var keyVal = title.replace("\r", "");
    var obj = { keyword: keyVal };
    words_dict[keyVal] = keyVal;
  });
  console.log("create words dict: ", words_dict);
}

async function openDB() {
  storeWords();
}

const installListener = (details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    openDB();
  }
  if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
    // openDB();
  }
};

chrome.runtime.onInstalled.addListener(installListener);

var hiddenContents = {
  home: new Object(), // home thumbnails
  homeF: new Object(), // home filter
  explore: new Object(), // explore page thumbnails
  trending: new Object(), // trending page thumbnails
  shorts: new Object(), // watch shorts page (playing videos)
  subscriptions: new Object(), // subscription page thumbnails
  library: new Object(), // libraray page thumbnails
  history: new Object(), // history page thumbnails
  download: new Object(), // donwload page thumbnails
  community: new Object(), // channel - community page text
  store: new Object(), // channel - store page
  playlist: new Object(), // playlist page thumbnails
  channel: new Object(), // channel - basic thumbnails
  watch: new Object(), // watch video page -  small thumbails
  watchMain: new Object(), // watch video page - playing main video
  watchF: new Object(), // watch video page - filter
  noti: new Object(), // notification
  pipTitle: new Object(), // pip - playing main video
  pipList: new Object(), // pip - playlist thumbnails
  channelV: new Object(), // channel - playing vido
  search: new Object(), // type S - search no food keyword but food contents
  typeS: new Object(), // type S - video log
};

var notHiddenContents = {
  home: new Object(),
  homeF: new Object(),
  explore: new Object(),
  trending: new Object(),
  shorts: new Object(),
  subscriptions: new Object(),
  library: new Object(),
  history: new Object(),
  download: new Object(),
  community: new Object(),
  store: new Object(),
  playlist: new Object(),
  channel: new Object(),
  watch: new Object(),
  watchMain: new Object(),
  watchF: new Object(),
  noti: new Object(),
  pipTitle: new Object(),
  pipList: new Object(),
  channelV: new Object(),
  search: new Object(),
  typeS: new Object(),
};

var flagForSearch = false;
var currUrl = new Object();
var currContentCount = new Object();
var contentExploringCount = new Object();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.request === "WORDS") {
    console.log("onMessage: words_dict is ", JSON.stringify(words_dict));
    sendResponse(JSON.stringify(words_dict));
    return true;
  }
  if (request.action === "is_new_loading") {
    if (
      request.newUrl !== currUrl[request.pageName] ||
      request.newContentCount !== currContentCount[request.pageName]
    ) {
      if (request.newUrl !== currUrl[request.pageName]) {
        currUrl = new Object();
        currContentCount = new Object();
      }
      currUrl[request.pageName] = request.newUrl;
      currContentCount[request.pageName] = request.newContentCount;
      contentExploringCount[request.pageName] = 0;
      console.log("(isNewLoading) new url || new count");
    }
    if (contentExploringCount[request.pageName] < CHECK_NUM) {
      contentExploringCount[request.pageName] += 1;
      hiddenContents[request.pageName] = new Object();
      notHiddenContents[request.pageName] = new Object();
      console.log("(isNewLoading) yes explore");
      sendResponse({ result: true });
    } else {
      console.log("(isNewLoading) no explore");
      sendResponse({ result: false });
    }
  }
  if (request.action === "CLEAR_KEY") {
    console.log("search claering past log: ", hiddenContents[request.key]);
    hiddenContents[request.key] = new Object();
    notHiddenContents[request.key] = new Object();
  }
  if (request.action === "TYPES") {
    console.log(
      `(TYPES) step: ${request.step}, keyword: ${request.keyword} isRequired: ${request.isRequired}, reason: ${request.reason}, warningImg: ${request.warningImg}`
    );
  }

  if (request.action === "search_check") {
    if (request.text === currentSearch) {
      sendResponse({ result: true });
    } else {
      sendResponse({ result: false });
    }
    return;
  }
  if (request.action === "search_init") {
    // console.log("(search) init new text:", request.text);
    currentSearch = request.text;
    return;
  }
  if (request.action === "search_flag_return") {
    sendResponse({ result: flagForSearch });
    return;
  }
  if (request.action === "search_flag_set") {
    flagForSearch = request.isFood; // true or false
    return;
  }
  if (request.isFood) {
    switch (request.action) {
      case "add":
        console.log("(back) yes food ", request.key + ": " + request.text);
        hiddenContents[request.key][request.text] = (
          new Date().toLocaleDateString().replaceAll("/", ".") +
          " " +
          new Date()
            .toLocaleTimeString("ko-KR", { hour12: false })
            .replaceAll(" ", "")
        )
          .replace("시", ":")
          .replace("분", ":")
          .replace("초", "");
        //Date.now().toString();
        sendResponse({ result: false });
        break;
      case "has":
        // console.log("has: ", request.key, request.text, hiddenContents[request.key].hasOwnProperty(request.text));
        sendResponse({
          result: hiddenContents[request.key].hasOwnProperty(request.text),
        });
        break;
      case "clear":
        Object.keys(hiddenContents).forEach((key) => {
          Object.keys(hiddenContents[key]).forEach((title) => {
            console.log("isFood and clear: key ", key, ": title ", title);
          });
          hiddenContents[key] = new Object();

          sendResponse({ result: false });
        });
      default:
        console.log("else case: ", request.action);
        sendResponse({ result: false });
    }
  } else {
    switch (request.action) {
      case "add":
        console.log("(back) no food ", request.key + ": " + request.text);
        notHiddenContents[request.key][request.text] = (
          new Date().toLocaleDateString().replaceAll("/", ".") +
          " " +
          new Date()
            .toLocaleTimeString("ko-KR", { hour12: false })
            .replaceAll(" ", "")
        )
          .replace("시", ":")
          .replace("분", ":")
          .replace("초", "");
        sendResponse({ result: false });
        break;
      case "has":
        sendResponse({
          result: notHiddenContents[request.key].hasOwnProperty(request.text),
        });
        break;
      case "clear":
        Object.keys(notHiddenContents).forEach((key) => {
          Object.keys(notHiddenContents[key]).forEach((title) => {});
          notHiddenContents[key] = new Object();
          sendResponse({ result: false });
        });
      default:
        sendResponse({ result: false });
    }
  }
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading") {
    chrome.tabs.query(
      { active: true, windowId: chrome.windows.WINDOW_ID_CURRENT },
      function (tabs) {
        if (tabs[0].url.split("/")[2] !== "www.youtube.com") {
          console.log("diff: ", tabs[0].url);
          Object.keys(hiddenContents).forEach((key) => {
            Object.keys(hiddenContents[key]).forEach((title) => {
              console.log("isFood and clear: key ", key, ": title ", title);
            });
            hiddenContents[key] = new Object();
          });

          Object.keys(notHiddenContents).forEach((key) => {
            Object.keys(notHiddenContents[key]).forEach((title) => {});
            notHiddenContents[key] = new Object();
          });
        }
      }
    );
  }
});

chrome.tabs.onRemoved.addListener(onRemoved);
function onRemoved(tabId, removeInfo) {
  console.log("tab removed");
  Object.keys(hiddenContents).forEach((key) => {
    Object.keys(hiddenContents[key]).forEach((title) => {});
    hiddenContents[key] = new Object();
  });

  Object.keys(notHiddenContents).forEach((key) => {
    Object.keys(notHiddenContents[key]).forEach((title) => {});
    notHiddenContents[key] = new Object();
  });
}
