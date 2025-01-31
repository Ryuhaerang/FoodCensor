var regExp = /[^ㄱ-ㅣ가-힣a-zA-Z0-9]/g;
var home_contentCount = 0;
var filterFlag = { home: false, watch: false };

var DB_VERSION = 99;
const ORIGIN_DB_VERSION = 99;

var currentPageName = "";
var currentChannelName = "";
var channelCount = 0;
var channelStore = "";
var subscriptionFlow = 1;
var filterWatchVideo = false;

var currentFirstShorts = "";
var currentshortscount = 0;
var currentCommunityCount = 0;
var libraryFlag = false;
var pipTitle = "";
var currentVideo = "";
var currentUrl = "";
var watchVideoTitle = "";
var flagQuery = false;
var isTypeC = false;
var flagForHidingWatchVideo = null;
var flagForHidingShorts = null;
var watchShortsTitle = "";
var watchPipTitle = "";
var currentNotiCount = 0;
var flagForFirstIntervention = false;
// var currentSearch = "";
var flagForHidingChannelVideo = false;
var channelVideoTitle = "";
var typeSTitles = "";
var typeSLastTitle = "";

var isInterventionDuration = false;

// css (hide & non-clickable)
var styles = `
    .hide_contents {
        opacity: 0;
        pointer-events: none;
    }
  .intervention_overlay {
    position: fixed; /* Sit on top of the page content */
    display: none; /* Hidden by default */
    width: 100%; /* Full width (cover the whole page) */
    height: 100%; /* Full height (cover the whole page) */
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0,0,0,0.5); /* Black background with opacity */
    z-index: 1;
  }
  .intervention_bg {
    background-color: black;
    width: 100%;
    height: 100%;
    position: fixed;
    z-index: 100;
  }

  .text {
    color: white;
    font-size: 35px;
  }

  .intervention {
    max-width: 800px;
    top: 45%;
    left: 45%;
    transform: translate(-50%, -50%);
    position: absolute;
    text-align: center;
  }

  .intervention_button {
    background-color: white;
    font-size: 20px;
    padding: 10px;
    margin: 10px;
    width: 200px;
    vertical-align: middle;
    height: 80px;
    border-radius: 12px;
  }
  .intervention_button:hover {
    background-color: #e7e7e7;
  }
  .yellow-button {
    background-color: #FFE41A;
  }
  .yellow-button:hover {
    background-color: #E7CF20;
  }

  .keyword {
    color: white;
    font-size: 35px;
    font-weight: bold;
  }
  .survey_input {
    background-color: #F2F2F2;
    font-size: 20px;
    padding: 10px;
    margin: 10px;
    width: 500px;
    height: 50px;
    border-radius: 12px;
  }
  .warning_text {
    color: #FFE41A;
    font-size: 35px;
  }
  .warning_img {
    max-height: 300px;
    margin: 10px;
  }
  .reference_text {
    color: #B4B4B4;
    font-size: 12px;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
  }
  .detail_text {
    color: white;
    font-size: 25px;
    width: 800px;
    word-break: keep-all;
  }
    `;
var styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

var db;

function once(fn, context) {
  var result;
  return function () {
    if (fn) {
      result = fn.apply(context || this, arguments);
      fn = null;
    }
    return result;
  };
}

const DB_STORE_NAME = "keywordStore";
const DB_NAME = "keywordDict";

isDbReady = false;

chrome.runtime.sendMessage({ request: "WORDS" }, function (response) {
  var words_dict;
  console.log("canOnlyFireOnce: SEND MESSAGE");
  if (response) {
    console.log("canOnlyFireOnce: response is ", JSON.parse(response));
    words_dict = JSON.parse(response);
    if (DB_VERSION == ORIGIN_DB_VERSION) DB_VERSION += 1;
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = function (evt) {
      // console.log("req: ", req);
      console.error("indexedDB : ", evt.target.error);
      return;
    };
    req.onupgradeneeded = function (evt) {
      db = this.result;
      console.log("createDB: indexedDB.onupgradedneeded");

      if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
        var store = db.createObjectStore(DB_STORE_NAME, { keyPath: "keyword" });

        store.createIndex("keyword", "keyword", { unique: true });
      } else {
        db.onsuccess = function (evt) {
          var transaction = db.transaction(DB_STORE_NAME, "readwrite");
          // IDBObjectStore
          var store = transaction.objectStore(DB_STORE_NAME);
          store.clear();
        };
      }
    };

    req.onsuccess = function (evt) {
      console.log("createDB: Success");
      db = this.result;
      storeWords(words_dict);
    };
  }
});

function storeWords(words_dict) {
  const DB_STORE_NAME = "keywordStore";
  console.log("storeWords: START");

  const keys = Object.keys(words_dict);
  console.log("storeWords: keys are ", keys);

  // IDBTransaction
  console.log("storeWords: db ", db);
  var transaction = db.transaction(DB_STORE_NAME, "readwrite");
  console.log("storeWords: transaction ", transaction);
  // IDBObjectStore
  var store = transaction.objectStore(DB_STORE_NAME);
  let req;
  console.log("storeWords: objectStore ", store);

  // Store words to DB
  keys.forEach(function (_keyword) {
    var obj = { keyword: _keyword };
    store.add(obj);
  });
  isDbReady = true;
  console.log("storeWords: FINISH");
}

new MutationObserver(function (mutations) {
  if (isDbReady) {
    page = window.location.href;
    if (currentUrl !== page) {
      currentUrl = page;
      sendMsgToBack(true, "clear", null, null);
      sendMsgToBack(false, "clear", null, null);
      flagQuery = false;
      watchVideoTitle = "";
      clearIntervention();
      filterFlag["home"] = false;
      filterFlag["watch"] = false;
      currentNotiCount = 0;
      home_contentCount = 0;
    }
    hideNoti();
    pageUrlArray = page.split("/");
    if (page != "https://www.youtube.com/feed/library") {
      libraryFlag = false;
    }
    if (
      document.querySelector("ytd-app") &&
      document.querySelector("ytd-app").getAttribute("miniplayer-is-active") !==
        null //&&
      // !flagForFirstIntervention
    ) {
      sendMsgToBack(null, "search_flag_return", null, null).then((result) => {
        if (!result) {
          hidePip();
        }
      });
    }
    switch (page) {
      case "https://www.youtube.com/":
        hideContents("home");
        if (!filterFlag["home"]) {
          hideFilter("home");
        }
        // currentSearch = "";
        sendMsgToBack(false, "search_flag_set", null, null);
        sendMsgToBack(null, "search_init", null, "");
        break;
      case "https://www.youtube.com/feed/explore":
        hideContents("explore");
        // currentSearch = "";
        sendMsgToBack(false, "search_flag_set", null, null);
        sendMsgToBack(null, "search_init", null, "");
        break;
      case "https://www.youtube.com/feed/trending?bp=6gQJRkVleHBsb3Jl":
        hideContents("trending");
        // currentSearch = "";
        sendMsgToBack(false, "search_flag_set", null, null);
        sendMsgToBack(null, "search_init", null, "");
        break;
      case "https://www.youtube.com/feed/subscriptions?flow=1":
        if (subscriptionFlow === 2) {
          subscriptionFlow = 1;
        }
        hideContents("subscriptions", "1");
        // currentSearch = "";
        sendMsgToBack(false, "search_flag_set", null, null);
        sendMsgToBack(null, "search_init", null, "");
        break;
      case "https://www.youtube.com/feed/subscriptions?flow=2":
        if (subscriptionFlow === 1) {
          subscriptionFlow = 2;
        }
        // currentSearch = "";
        sendMsgToBack(false, "search_flag_set", null, null);
        sendMsgToBack(null, "search_init", null, "");
        hideContents("subscriptions", "2");
        break;
      case "https://www.youtube.com/feed/subscriptions":
        if (subscriptionFlow === 2) {
          subscriptionFlow = 1;
        }
        hideContents("subscriptions", "0");
        // currentSearch = "";
        sendMsgToBack(false, "search_flag_set", null, null);
        sendMsgToBack(null, "search_init", null, "");
        break;
      case "https://www.youtube.com/feed/library":
        hideContents("library");
        // currentSearch = "";
        sendMsgToBack(false, "search_flag_set", null, null);
        sendMsgToBack(null, "search_init", null, "");
        break;
      case "https://www.youtube.com/feed/history":
        hideContents("history");
        // currentSearch = "";
        sendMsgToBack(false, "search_flag_set", null, null);
        sendMsgToBack(null, "search_init", null, "");
        break;
      case "https://www.youtube.com/feed/downloads":
        hideContents("download");
        // currentSearch = "";
        sendMsgToBack(false, "search_flag_set", null, null);
        sendMsgToBack(null, "search_init", null, "");
      default:
        if (pageUrlArray[3] === "shorts") {
          hideWatchVideo("shorts");
          // currentSearch = "";
          sendMsgToBack(false, "search_flag_set", null, null);
          sendMsgToBack(null, "search_init", null, "");
        } else if (pageUrlArray[3] === "channel" || pageUrlArray[3] === "c") {
          //&& !flagForFirstIntervention) {
          // sendMsgToBack(null, "search_flag_return", null, null).then((result) => {
          // if (!result) {
          // currentSearch = "";
          sendMsgToBack(false, "search_flag_set", null, null);
          sendMsgToBack(null, "search_init", null, "");
          if (pageUrlArray[5] === "community") {
            hideContents("community", pageUrlArray[4]);
          } else if (pageUrlArray[5] === "store") {
            hideContents("store", pageUrlArray[4]);
          } else {
            hideContents("channel", pageUrlArray[4]);
            hideWatchVideo("channelV");
            // console.log("hide contents channel");
          }
          // }
          // });
        } else if (pageUrlArray[3].split("?")[0] === "playlist") {
          // currentSearch = "";
          sendMsgToBack(false, "search_flag_set", null, null);
          sendMsgToBack(null, "search_init", null, "");
          hideContents("playlist", pageUrlArray[3].split("?")[1]);
        } else if (pageUrlArray[3].split("?")[0] === "watch") {
          //&& !flagForFirstIntervention) {
          sendMsgToBack(null, "search_flag_return", null, null).then(
            (result) => {
              if (!result) {
                // type c
                // console.log("watch video in type C");
                hideWatchVideo("watchMain");
                if (!filterFlag["watch"]) {
                  hideFilter("watch");
                }
                hideContents("watch", pageUrlArray[3].split("?")[1]);
              } else {
                // console.log("watch video in type S");
              }
            }
          );
        } else if (pageUrlArray[3].split("?")[0] === "results") {
          // if (!flagQuery) {
          sendMsgToBack(true, "search_flag_set", null, null);
          firstIntervention(pageUrlArray[3].split("?")[1].split("=")[1]);
          // } else {
          // sendMsgToBack(null, "search_flag_return", null, null).then((result) => {
          //   if (result === false) {
          //     // clearSearchLog("search", -1);
          //     console.log("(search) case type c (hide)");
          //     hideContents("search", "");
          //   } else {
          //     console.log("(search) case type s (intervention)");
          //     // clearSearchLog("search", -1);
          //   }
          // });
        } else if (page.split(page.indexOf("?") + 1, page.lastIndexOf("="))) {
          // home (https://www.youtube.com/?bp=wgUCEAE%3D)
          hideContents("home");
          if (!filterFlag["home"]) {
            hideFilter("home");
          }
          sendMsgToBack(false, "search_flag_set", null, null);
          sendMsgToBack(null, "search_init", null, "");
        }
        // }
        break;
    }
  }
}).observe(document, {
  subtree: true,
  childList: true,
});

/**
 * hide contents start
 */

//async function dbSearch(db, valArray, content){
var dbSearch = (valArray, wordIdx, idx, pageName, text, totalLen) => {
  // console.log("dbSearch: START");
  var isLastRotation = false;
  Object.keys(POSTPOSITION).forEach((pp, pi) => {
    pl = POSTPOSITION[pp];
    if (pi === Object.keys(POSTPOSITION).length - 1) {
      isLastRotation = true;
    }
    if (
      pl < valArray.length &&
      valArray.substring(valArray.length - pl) === pp
    ) {
      var newValArray = valArray.substring(0, valArray.length - pl);
      db
        .transaction("keywordStore")
        .objectStore("keywordStore")
        .get(newValArray).onsuccess = function (evt) {
        if (typeof evt.target.result !== "undefined") {
          flagForHiding[idx] = true;

          // console.log(pageName, "Contents: Detected Word is ", valArray, idx, flagForHiding[idx]);
        }
        if (wordIdx === totalLen - 1 && isLastRotation) {
          if (flagForHiding[idx]) {
            console.log(`(${pageName}) text: ${text}`);
            sendMsgToBack(true, "add", pageName, text);
            if (pageName === "typeS") {
              // pass
            } else if (
              pageName === "store" ||
              (hideContents_content[idx] &&
                hideContents_content[idx].className.includes(
                  "ytd-playlist-renderer"
                ))
            ) {
              // 3
              hideContents_content[
                idx
              ].parentElement.parentElement.parentElement.classList.add(
                "hide_contents"
              );
            } else if (
              hideContents_content[idx] &&
              hideContents_content[idx].className.includes(
                "ytd-grid-playlist-renderer"
              )
            ) {
              // 2
              hideContents_content[
                idx
              ].parentElement.parentElement.classList.add("hide_contents");
            } else if (
              pageName === "community" ||
              (hideContents_content[idx] &&
                hideContents_content[idx].className.includes(
                  "ytd-radio-renderer"
                ))
            ) {
              // 4
              hideContents_content[
                idx
              ].parentElement.parentElement.parentElement.parentElement.classList.add(
                "hide_contents"
              );
            } else if (hideContents_content[idx]) {
              // 5
              // console.log(`debug tag:`, hideContents_content[idx]);
              // console.log(`debug parent tag:`, hideContents_content[idx].parentElement.parentElement.parentElement.parentElement.parentElement);
              hideContents_content[
                idx
              ].parentElement.parentElement.parentElement.parentElement.parentElement.classList.add(
                "hide_contents"
              );
            }
          } else {
            sendMsgToBack(false, "add", pageName, text);
            if (pageName === "typeS") {
              // pass
            } else if (
              pageName === "store" ||
              (hideContents_content[idx] &&
                hideContents_content[idx].className.includes(
                  "ytd-playlist-renderer"
                ))
            ) {
              // 3
              hideContents_content[
                idx
              ].parentElement.parentElement.parentElement.classList.remove(
                "hide_contents"
              );
            } else if (
              hideContents_content[idx] &&
              hideContents_content[idx].className.includes(
                "ytd-grid-playlist-renderer"
              )
            ) {
              // 2
              hideContents_content[
                idx
              ].parentElement.parentElement.classList.remove("hide_contents");
            } else if (
              pageName === "community" ||
              (hideContents_content[idx] &&
                hideContents_content[idx].className.includes(
                  "ytd-radio-renderer"
                ))
            ) {
              // 4
              hideContents_content[
                idx
              ].parentElement.parentElement.parentElement.parentElement.classList.remove(
                "hide_contents"
              );
            } else if (hideContents_content[idx]) {
              // 5
              hideContents_content[
                idx
              ].parentElement.parentElement.parentElement.parentElement.parentElement.classList.remove(
                "hide_contents"
              );
            }
          }
        }
        const lock = "";
        return new Promise((resolve) => lock);
      };
    }
  });
};

var extractTextArray = (idx, pageName, hideContents_content) => {
  var text = hideContents_content[idx].innerText;
  if (text) {
    text = text.replace(regExp, " ");
    text = text.replace("ㅣ", " ");
    text = text.toLowerCase();
    // console.log("text is ", text);
    text = text.trim();
    array = text.split(/[\s]+/);

    const loop = async (array) => {
      const promises = await array.map(async (valArray, wordIdx) => {
        const ct = new Promise((resolve, reject) => {
          dbSearch(valArray, wordIdx, idx, pageName, text, array.length);
        });
        return ct;
      });
      const results = await Promise.all(promises);
      return;
    };
    return new Promise((resolve) => {
      loop(array);
    });
  } else {
    const lock = false;
    return new Promise((resolve) => lock);
  }
};

function hideContents(pageName, subName) {
  // const DB_VERSION = 11;
  container = document.querySelector("[role='main']");
  if (!container) {
    const lock = "";
    return new Promise((resolve) => lock);
  }
  hideContents_content = null;
  if (pageName === "store") {
    if (container.querySelectorAll("[id=product-name]")) {
      hideContents_content = container.querySelectorAll("[id=product-name]");
    }
  } else if (pageName === "community") {
    if (container.querySelectorAll("#content-text")) {
      hideContents_content = container.querySelectorAll("#content-text");
    }
  } else if (pageName === "search") {
    container = document.querySelector("ytd-search");
    if (container && container.querySelectorAll("h3")) {
      hideContents_content = container.querySelectorAll("h3");
    }
  } else {
    if (container.querySelectorAll("[id=video-title]")) {
      hideContents_content = container.querySelectorAll("[id=video-title]");
    }
  }
  if (hideContents_content) {
    isNewLoading(
      pageName,
      window.location.href,
      hideContents_content.length
    ).then((result) => {
      if (result) {
        var request = indexedDB.open("keywordDict", DB_VERSION);
        // clearSearchLog(pageName, -1);
        request.onsuccess = function (evt) {
          flagForHiding = new Array(hideContents_content.length).fill(false);
          db = evt.target.result;
          const outer_loop = async () => {
            const outer_promises = await [
              ...Array(hideContents_content.length).keys(),
            ].map(async (idx) => {
              const tmp = new Promise((resolve, reject) => {
                extractTextArray(idx, pageName, hideContents_content);
              });
              return tmp;
            });
            const outer_results = await Promise.all(outer_promises);
            return outer_results;
          };
          outer_loop();
          // }
        };
      } else {
        console.log("(isNewLoading) pass");
      }
    });
  }
}

/**
 * hide contents end
 */

/**
 * hide filter start
 */

var dbSearch_filter = (
  db,
  valArray,
  idx,
  pageName,
  wordIdx,
  filterTotalLen,
  title
) => {
  db
    .transaction("keywordStore")
    .objectStore("keywordStore")
    .get(valArray.toLowerCase()).onsuccess = function (evt) {
    if (typeof evt.target.result != "undefined") {
      console.log(`(${pageName})text: ${title}`);
      flagForHidingFilter[idx] = true;
    } else {
      //
    }
    if (wordIdx === filterTotalLen - 1) {
      // console.log(title, flagForHidingFilter[idx]);
      // last index
      if (flagForHidingFilter[idx]) {
        keyword[idx].parentElement.classList.add("hide_contents");
        if (pageName === "home") {
          sendMsgToBack(true, "add", "homeF", title);
        } else {
          sendMsgToBack(true, "add", "watchF", title);
        }
      } else {
        keyword[idx].parentElement.classList.remove("hide_contents");
        if (pageName === "home") {
          sendMsgToBack(false, "add", "homeF", title);
        } else {
          sendMsgToBack(false, "add", "watchF", title);
        }
      }
    }
    const lock = false;
    return new Promise((resolve) => lock);
  };
};

var extractTextArray_filter = (db, title, idx, pageName) => {
  var titleArray = title.split(" ");
  const loop_titleArray = async (db, titleArray, idx) => {
    const promises = await titleArray.map(async (valArray, wordIdx) => {
      const ct = new Promise((resolve, reject) => {
        dbSearch_filter(
          db,
          valArray,
          idx,
          pageName,
          wordIdx,
          titleArray.length,
          title
        );
      });
      return ct;
    });

    const results = await Promise.all(promises);
    return results;
  };

  return new Promise((resolve) => {
    //keyword =
    loop_titleArray(db, titleArray, idx);
  });
};

function hideFilter(pageName) {
  container = document.querySelector("[role='main']");

  var db;
  var request = indexedDB.open("keywordDict", DB_VERSION);

  request.onsuccess = function (evt) {
    db = evt.target.result;
    if (container && container.querySelector("#chips")) {
      container = container.querySelector("#chips");
      filterFlag[pageName] = true;
      keyword = container.querySelectorAll(".yt-chip-cloud-chip-renderer");
      flagForHidingFilter = new Array(keyword.length).fill(false);
      // console.log("filter tags ", keyword);
      const loop_keywords = async (db, keyword) => {
        const promises_keyword = await [...Array(keyword.length).keys()].map(
          async (idx) => {
            if (keyword[idx].title) {
              const lock = new Promise((resolve, reject) => {
                extractTextArray_filter(db, keyword[idx].title, idx, pageName);
              });
              return lock;
            } else {
              const lock = "";
              return new Promise((resolve, reject) => {
                resolve(lock);
              }); // nothing
            }
          }
        );

        const loop_keyword_results = await Promise.all(promises_keyword);
      };

      loop_keywords(db, keyword);
    }
  };
}
/**
 * hide filter start
 */
/**
 * hide playing video start
 */

var dbSearch_watchVideo = (
  valTextArray,
  wordIdx,
  pageName,
  text,
  textArrayLength
) => {
  var isLastRotation = false;
  Object.keys(POSTPOSITION).forEach((pp, pi) => {
    pl = POSTPOSITION[pp];
    if (pi === Object.keys(POSTPOSITION).length - 1) {
      isLastRotation = true;
    }
    if (
      pl < valTextArray.length &&
      valTextArray.substring(valTextArray.length - pl) === pp
    ) {
      var newKeyword = valTextArray.substring(0, valTextArray.length - pl);
      db
        .transaction("keywordStore")
        .objectStore("keywordStore")
        .get(newKeyword).onsuccess = function (evt) {
        if (typeof evt.target.result != "undefined") {
          console.log(`(${pageName}) text: ${text}`);
          if (pageName === "watchMain") flagForHidingWatchVideo = true;
          if (pageName === "channelV") flagForHidingChannelVideo = true;
          if (pageName === "shorts") flagForHidingShorts = true;
        }

        if (wordIdx === textArrayLength - 1 && isLastRotation) {
          // css
          switch (pageName) {
            case "watchMain":
              if (flagForHidingWatchVideo) {
                console.log(`(${pageName}) text: ${text}`);
                titleTag.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.classList.add(
                  "hide_contents"
                );
                if (container.querySelector("video")) {
                  container.querySelector("video").muted = true;
                  container
                    .querySelector("video")
                    .classList.add("hide_contents");
                  sendMsgToBack(true, "add", pageName, text);
                }
              } else {
                titleTag.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.classList.remove(
                  "hide_contents"
                );
                if (container && container.querySelector("video")) {
                  container.querySelector("video").muted = false;
                  container
                    .querySelector("video")
                    .classList.remove("hide_contents");
                  sendMsgToBack(false, "add", pageName, text);
                }
              }
              break;
            case "channelV":
              if (flagForHidingChannelVideo) {
                // console.log("WatchVideo: Detected Word is ", valTextArray);
                // console.log("WatchVideo: Detected Text is ", text);
                console.log(`(${pageName}) text: ${text}`);
                channelV.parentElement.parentElement.parentElement.classList.add(
                  "hide_contents"
                );
                if (container.querySelector("video")) {
                  container.querySelector("video").muted = true;
                  container
                    .querySelector("video")
                    .classList.add("hide_contents");
                  sendMsgToBack(true, "add", pageName, text);
                }
              } else {
                channelV.parentElement.parentElement.parentElement.classList.remove(
                  "hide_contents"
                );
                if (container.querySelector("video")) {
                  container.querySelector("video").muted = false;
                  container
                    .querySelector("video")
                    .classList.remove("hide_contents");
                  sendMsgToBack(false, "add", pageName, text);
                }
              }
              break;
            case "shorts":
              if (flagForHidingShorts) {
                console.log(`(${pageName}) text: ${text}`);
                titleTag.parentElement.parentElement.classList.add(
                  "hide_contents"
                );
                videoTag.parentElement.parentElement.parentElement.parentElement.parentElement.classList.add(
                  "hide_contents"
                );
                if (container.querySelector("video")) {
                  container.querySelector("video").muted = true;
                  container
                    .querySelector("video")
                    .classList.add("hide_contents");
                  sendMsgToBack(true, "add", pageName, text);
                }
              } else {
                titleTag.parentElement.parentElement.classList.remove(
                  "hide_contents"
                );
                videoTag.parentElement.parentElement.parentElement.parentElement.parentElement.classList.remove(
                  "hide_contents"
                );
                if (container.querySelector("video")) {
                  container.querySelector("video").muted = false;
                  container
                    .querySelector("video")
                    .classList.remove("hide_contents");
                  sendMsgToBack(false, "add", pageName, text);
                }
              }
              break;
          }
        }
      };
    }
  });
  const lock = "";
  return new Promise((resolve) => lock);
};

function hideWatchVideo(pageName) {
  container = document.querySelector("[role='main']");

  var request = indexedDB.open("keywordDict", DB_VERSION);

  request.onsuccess = function (evt) {
    db = evt.target.result;

    if (pageName === "watchMain") {
      if (container && container.querySelector("h1")) {
        // 220731 HR: remove var from titleTag
        titleTag = container.querySelector("h1");
        isNewLoading(pageName, window.location.href, 1).then((result) => {
          if (result) {
            var text = titleTag.innerText;
            if (text) {
              text = text.replace(regExp, " ");
              text = text.replace("ㅣ", " ");
              text = text.toLowerCase();
              if (watchVideoTitle === text) {
                return;
              }
              text = text.trim();
              watchVideotextArray = text.split(/[\s]+/);
              watchVideoTitle = text;

              const loop_textArray = async (watchVideotextArray) => {
                flagForHidingWatchVideo = false;
                const promises = await watchVideotextArray.map(
                  async (valTextArray, wordIdx) => {
                    const ct = new Promise((resolve, reject) => {
                      dbSearch_watchVideo(
                        valTextArray,
                        wordIdx,
                        pageName,
                        text,
                        watchVideotextArray.length,
                        container
                      );
                    });
                    return ct;
                  }
                );
                const results = await Promise.all(promises);
                return results;
              };

              loop_textArray(watchVideotextArray);
            }
          }
        });
      }
    } else if (pageName === "channelV") {
      // 채널 페이지에서 재생 중인 영상 가끔 있음...
      if (container && container.querySelector("#title")) {
        channelV = container.querySelector("#title");
        isNewLoading(pageName, window.location.href, 1).then((result) => {
          if (result) {
            var text = channelV.innerText;
            if (text) {
              text = text.replace(regExp, " ");
              text = text.replace("ㅣ", " ");
              text = text.toLowerCase();
              if (channelVideoTitle === text) {
                return;
              }
            }
            text = text.trim();
            textArray = text.split(/[\s]+/);
            channelVideoTitle = text;

            const loop_channelV = async (textArray) => {
              flagForHidingChannelVideo = false;
              const promises = await textArray.map(
                async (valTextArray, wordIdx) => {
                  const ct = new Promise((resolve, reject) => {
                    dbSearch_watchVideo(
                      valTextArray,
                      wordIdx,
                      pageName,
                      text,
                      textArray.length,
                      container
                    );
                  });
                  return ct;
                }
              );
              const results = await Promise.all(promises);
              return results;
            };

            loop_channelV(textArray);
          }
        });
      }
    } else {
      // shorts
      if (container && container.querySelector("video")) {
        videoTag = container.querySelector("video");
        isNewLoading(pageName, window.location.href, 1).then((result) => {
          if (result) {
            titleTag =
              videoTag.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.querySelectorAll(
                "h2"
              )[1];
            var text = titleTag.innerText;
            if (text && text !== watchShortsTitle) {
              watchShortsTitle = text;
              text = text.replace(regExp, " ");
              text = text.replace("ㅣ", " ");
              text = text.toLowerCase();
              text = text.trim();
              textArray = text.split(/[\s]+/);

              const loop_shorts = async (textArray) => {
                flagForHidingShorts = false;
                const promises = await textArray.map(
                  async (valTextArray, wordIdx) => {
                    const ct = new Promise((resolve, reject) => {
                      dbSearch_watchVideo(
                        valTextArray,
                        wordIdx,
                        pageName,
                        text,
                        textArray.length,
                        container
                      );
                    });
                    return ct;
                  }
                );
                const results = await Promise.all(promises);
                return results;
              };

              loop_shorts(textArray);
            }
          }
        });
      }
    }
  };
}
/**
 * hide playing video end
 */
/**
 * hide noti start
 */

var dbSearch_noti = (valTextArray, wordIdx, idx, text, totalLen) => {
  var isLastRotation = false;
  Object.keys(POSTPOSITION).forEach((pp, pi) => {
    pl = POSTPOSITION[pp];
    if (pi === Object.keys(POSTPOSITION).length - 1) {
      isLastRotation = true;
    }
    if (
      pl < valTextArray.length &&
      valTextArray.substring(valTextArray.length - pl) === pp
    ) {
      var newKeyword = valTextArray.substring(0, valTextArray.length - pl);
      db
        .transaction("keywordStore")
        .objectStore("keywordStore")
        .get(newKeyword).onsuccess = function (evt) {
        if (typeof evt.target.result !== "undefined") {
          // console.log("Noti: Detected Word is ", valTextArray);
          console.log(`(noti) text: ${text}`);
          flagForHidingNoti[idx] = true;
        }
        if (wordIdx === totalLen - 1 && isLastRotation) {
          if (flagForHidingNoti[idx]) {
            sendMsgToBack(true, "add", "noti", text);
            msgTags[idx].parentElement.parentElement.classList.add(
              "hide_contents"
            );
          } else {
            sendMsgToBack(false, "add", "noti", text);
            msgTags[idx].parentElement.parentElement.classList.remove(
              "hide_contents"
            );
          }
        }
      };

      const lock = "";
      return new Promise((resolve) => lock);
    }
  });
};

var extractTextArray_noti = (idx, msgTags) => {
  var text = msgTags[idx].innerText;
  if (text) {
    text = text.replace(regExp, " ");
    text = text.replace("ㅣ", " ");
    text = text.toLowerCase();
    text = text.trim();
    notiArray = text.split(/[\s]+/);

    const loop_notiArray = async (notiArr, idx) => {
      const promises_notiArray = await notiArr.map(
        async (notiWord, wordIdx) => {
          const ct = new Promise((resolve, reject) => {
            dbSearch_noti(notiWord, wordIdx, idx, text, notiArray.length);
          });
          return ct;
        }
      );

      const results = await Promise.all(promises_notiArray);
      return results;
    };
    return new Promise((resolve) => {
      loop_notiArray(notiArray, idx);
    });
  } else {
    const lock = false;
    return new Promise((resolve) => lock);
  }
};

function hideNoti() {
  // const DB_VERSION = 11;
  container = document.querySelector("ytd-multi-page-menu-renderer");
  if (container && container.querySelectorAll(".message")) {
    var request = indexedDB.open("keywordDict", DB_VERSION);
    msgTags = container.querySelectorAll(".message");
    isNewLoading("noti", window.location.href, msgTags.length).then(
      (result) => {
        if (result) {
          flagForHidingNoti = new Array(msgTags.length).fill(false);
          request.onsuccess = function (evt) {
            db = evt.target.result;
            const loop_msgTags = async (db) => {
              const promises_msgTags = await [
                ...Array(msgTags.length).keys(),
              ].map(async (idx) => {
                const tmp = new Promise((resolve, reject) => {
                  extractTextArray_noti(idx, msgTags);
                });
                return tmp;
              });
              const results = await Promise.all(promises_msgTags);
              return results;
            };
            loop_msgTags(db);
          };
        }
      }
    );
  }
}

/**
 * hide noti end
 */
/**
 * hide pip start
 */

var dbSearch_pip = (
  valTextArray,
  wordIdx,
  pipText,
  textArrayLength,
  pageName,
  idx
) => {
  // console.log("dbSearch_pip: START with text: ", text);
  if (pageName === "pipTitle") {
    // pip video
    var isLastRotation = false;
    Object.keys(POSTPOSITION).forEach((pp, pi) => {
      pl = POSTPOSITION[pp];
      if (pi === Object.keys(POSTPOSITION).length - 1) {
        isLastRotation = true;
      }
      if (
        pl < valTextArray.length &&
        valTextArray.substring(valTextArray.length - pl) === pp
      ) {
        var newValTextArray = valTextArray.substring(
          0,
          valTextArray.length - pl
        );
        db
          .transaction("keywordStore")
          .objectStore("keywordStore")
          .get(newValTextArray).onsuccess = function (evt) {
          if (typeof evt.target.result !== "undefined") {
            // console.log("dbSearch pip title: Detected Word is ", valTextArray);
            flagForHidingPipTitle = true;
          }
          if (wordIdx === textArrayLength - 1 && isLastRotation) {
            if (flagForHidingPipTitle) {
              pipTitleTag.parentElement.parentElement.parentElement.parentElement.parentElement.classList.add(
                "hide_contents"
              );
              console.log(`(pip playing) text: ${pipText}`);
              if (pipContainer.querySelector("video")) {
                pipContainer.querySelector("video").muted = true;
                pipContainer
                  .querySelector("video")
                  .classList.add("hide_contents");
                sendMsgToBack(true, "add", pageName, pipText);
              }
            } else {
              pipTitleTag.parentElement.parentElement.parentElement.parentElement.parentElement.classList.remove(
                "hide_contents"
              );
              if (pipContainer.querySelector("video")) {
                pipContainer.querySelector("video").muted = false;
                pipContainer
                  .querySelector("video")
                  .classList.remove("hide_contents");
                sendMsgToBack(false, "add", pageName, pipText);
              }
            }
          }
          const lock = "";
          return new Promise((resolve) => lock);
        };
      }
    });
  } else {
    // pip playlist
    var isLastRotation = false;
    Object.keys(POSTPOSITION).forEach((pp, pi) => {
      pl = POSTPOSITION[pp];
      if (pi === Object.keys(POSTPOSITION).length - 1) {
        isLastRotation = true;
      }
      if (
        pl < valTextArray.length &&
        valTextArray.substring(valTextArray.length - pl) === pp
      ) {
        var newValTextArray = valTextArray.substring(
          0,
          valTextArray.length - pl
        );
        db
          .transaction("keywordStore")
          .objectStore("keywordStore")
          .get(newValTextArray).onsuccess = function (evt) {
          if (typeof evt.target.result !== "undefined") {
            flagForHidingPipList[idx] = true;
          }
          if (wordIdx === textArrayLength - 1) {
            if (flagForHidingPipList[idx]) {
              console.log(`(pip list) text: ${text}`);
              textTag[
                idx
              ].parentElement.parentElement.parentElement.parentElement.classList.add(
                "hide_contents"
              );
              sendMsgToBack(true, "add", pageName, pipText);
            } else {
              textTag[
                idx
              ].parentElement.parentElement.parentElement.parentElement.classList.remove(
                "hide_contents"
              );
              sendMsgToBack(false, "add", pageName, pipText);
            }
          }
          const lock = "";
          return new Promise((resolve) => lock);
        };
      }
    });
  }
};

var extractTextArray_pip = (idx) => {
  var pipText = textTag[idx].title.replace(regExp, " ");
  pipText = pipText.replace("ㅣ", " ");
  pipText = pipText.toLowerCase();
  pipText = pipText.trim();
  var textArray = pipText.split(/[\s]+/);
  const loop_textArray = async (textArray) => {
    const promises = await textArray.map(async (valTextArray, wordIdx) => {
      const ct = new Promise((resolve, reject) => {
        dbSearch_pip(
          valTextArray,
          wordIdx,
          pipText,
          textArray.length,
          "pipList",
          idx
        );
      });
      return ct;
    });
    const results = await Promise.all(promises);
    return results;
  };

  loop_textArray(textArray);
};

function hidePip() {
  pipContainer = document.querySelector("ytd-miniplayer");
  if (pipContainer && pipContainer.querySelector(".miniplayer-title")) {
    pipTitleTag = pipContainer.querySelector(".miniplayer-title");
    pipText = pipTitleTag.title.replace(regExp, " ");
    pipText = pipText.replace("ㅣ", " ");
    if (pipText !== watchPipTitle) {
      // console.log("pip text: ", text);
      watchPipTitle = pipText;
      pipText = pipText.trim();
      textArray = pipText.split(/[\s]+/);

      const loop_textArray = async (textArray) => {
        const promises = await textArray.map(async (valTextArray, wordIdx) => {
          const ct = new Promise((resolve, reject) => {
            flagForHidingPipTitle = false;
            dbSearch_pip(
              valTextArray,
              wordIdx,
              pipText,
              textArray.length,
              "pipTitle",
              -1
            );
          });
          return ct;
        });
        const results = await Promise.all(promises);
        return results;
      };

      loop_textArray(textArray);

      // pip playlist
      if (pipContainer.querySelectorAll("#video-title")) {
        textTag = pipContainer.querySelectorAll("#video-title");
        flagForHidingPipList = new Array(textTag.length).fill(false);

        const loop_textTag = async () => {
          const promises_textTag = await [...Array(textTag.length).keys()].map(
            async (idx) => {
              const tmp = new Promise((resolve, reject) => {
                extractTextArray_pip(idx);
              });
              return tmp;
            }
          );
          const results_textTag = await Promise.all(promises_textTag);
          return results_textTag;
        };

        loop_textTag();
      }
    }
  }
}
/**
 * hide pip end
 */

async function sendMsgToBack(isFood, action, key, text) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { isFood: isFood, action: action, key: key, text: text, result: null },
      function (response) {
        if (action === "search_check" && response) {
          result = response.result;
          resolve(result);
        } else if (action === "has" && response) {
          result = response.result;
          resolve(result);
        } else if (action === "search_flag_return") {
          resolve(response.result);
        } else {
          resolve(false);
        }
      }
    );
  });
}

async function clearSearchLog(key, length) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "CLEAR_KEY", key: key, length: length },
      function (response) {}
    );
  });
}
async function isNewLoading(pageName, newUrl, newContentCount) {
  if (newUrl) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: "is_new_loading",
          pageName: pageName,
          newUrl: newUrl,
          newContentCount,
          newContentCount,
        },
        function (response) {
          if (response) {
            resolve(response.result);
          } else {
            resolve(true);
          }
        }
      );
    });
  }
}

/**
 * type s start
 */
var dbSearch_searchKey = (idx, keyword, totalLen, isCheckAgain) => {
  // console.log("in dbsearch_searchkey");
  // 여기서 post position 확인
  var isLastRotation = false;
  Object.keys(POSTPOSITION).forEach((pp, pi) => {
    pl = POSTPOSITION[pp];
    if (pi === Object.keys(POSTPOSITION).length - 1) {
      isLastRotation = true;
    }
    if (
      pl < searchKeyArray[idx].length &&
      searchKeyArray[idx].substring(searchKeyArray[idx].length - pl) === pp
    ) {
      var newKeyword = searchKeyArray[idx].substring(
        0,
        searchKeyArray[idx].length - pl
      );
      db
        .transaction("keywordStore")
        .objectStore("keywordStore")
        .get(newKeyword).onsuccess = function (evt) {
        // console.log("(postposition) new keyword: ", newKeyword, " original: ", keyword);
        if (typeof evt.target.result !== "undefined") {
          flagSearchKey = true;
        }
        if (isCheckAgain) {
          if (idx === totalLen - 1 && isLastRotation) {
            if (flagSearchKey) {
              // yes food -> type s
              // console.log("recheck -> type s");
              sendMsgToBack(true, "search_flag_set", null, null);
              sendMsgToBack(null, "search_init", null, text);
              hideContents("typeS", text);
            } else {
              // not food -> type c
              // console.log("recheck -> type c");
              sendMsgToBack(false, "search_flag_set", null, null); // type c
              sendMsgToBack(null, "search_init", null, text);
              hideContents("search", text);
            }
          }
        } else {
          if (idx === totalLen - 1 && isLastRotation) {
            // last index
            if (flagSearchKey) {
              // yes food
              sendMsgToBack(true, "search_flag_set", null, null);
              console.log(`(saerch typeS) text: ${text}`);
              var container = document.querySelector("[role='main']");
              var contents = container.querySelectorAll("[id=video-title]");
              if (
                container.firstChild &&
                !(
                  document.querySelector("firstWindow") ||
                  document.querySelector("secondWindow") ||
                  document.querySelector("firstQuestion") ||
                  document.querySelector("secondQuestion")
                )
              ) {
                firstWindow.innerHTML = `
                  <div class="intervention">
                    <p class="text">Do you need to watch</p>
                    <p class="keyword">${text}</p>
                    <p class="text">now?</p></br>
                    <button id="btn_yes" class="intervention_button">Yes</button>
                    <button id="btn_no" class="yellow-button intervention_button">No, will watch</br>other video</button>
                    <button id="btn_but" class="intervention_button">No, but</br>will watch</button>
                  </div>
                  `;
                // console.log(firstWindow.innerHTML);
                container.parentElement.insertBefore(firstWindow, container);
                container.classList.add("intervention_overlay");
                firstWindow.classList.add("intervention_bg");
                document
                  .querySelector("#btn_yes")
                  .addEventListener("click", function () {
                    firstQuestion.innerHTML = `
                      <div class="intervention">
                      <p class="text">Why do you need to watch</p>
                      <p class="keyword">${text}</p>
                      <p class="text">now?</p></br>
                      <input class="survey_input" id="first_input" type="text" placeholder="Please write the reason" autofocus></input><br>
                      <button id="btn_submit" class="yellow-button intervention_button">Submit</button>
                      </div>
                    `;
                    container.parentElement.insertBefore(
                      firstQuestion,
                      container
                    );
                    firstQuestion.classList.add("intervention_bg");
                    document
                      .querySelector("#btn_submit")
                      .addEventListener("click", function () {
                        if (!document.querySelector("#first_input").value) {
                          alert("Please write the reason");
                        } else {
                          sendMsgToBack(null, "search_init", null, text);
                          firstQuestion.remove();
                          container.classList.remove("intervention_overlay");
                          clearIntervention();
                          if (document.querySelectorAll(".hide_contents")) {
                            var tags =
                              document.querySelectorAll(".hide_contents");
                            for (var i = 0; i < tags.length; i++) {
                              tags[i].classList.remove("hide_contents");
                            }
                          }
                          hideContents("typeS", text);
                        }
                      });
                    document
                      .querySelector("#first_input")
                      .addEventListener("keyup", function (event) {
                        if (event.keyCode === 13) {
                          event.preventDefault();
                          document.querySelector("#btn_submit").click();
                        }
                      });
                    firstWindow.remove();
                  });
                document
                  .querySelector("#btn_no")
                  .addEventListener("click", function () {
                    sendMsgToBack(null, "search_init", null, "");
                    window.location.href = "http://www.youtube.com/";
                    firstWindow.remove();
                  });
                document
                  .querySelector("#btn_but")
                  .addEventListener("click", function () {
                    firstWindow.remove();
                    secondIntervention(text);
                  });
              }
            } else {
              // not food
              sendMsgToBack(false, "search_flag_set", null, null); // type c
              sendMsgToBack(null, "search_init", null, text);
              hideContents("search", text);
            }
          }
        }

        const lock = "";
        return new Promise((resolve) => lock);
      };
    }
  });
};

var firstWindow = document.createElement("firstWindow");
var firstQuestion = document.createElement("firstQuestion");

function firstIntervention(queryString) {
  originalText = decodeURI(queryString);
  text = originalText.replace(regExp, " ");
  text = text.replace("ㅣ", " ");
  text = text.toLowerCase();
  if (text) {
    text = text.trim();
    searchKeyArray = text.split(" ");
    sendMsgToBack(null, "search_check", null, text).then((isSameKey) => {
      if (isSameKey) {
        // type c 일 경우 flag false 필요
        var request = indexedDB.open("keywordDict", DB_VERSION);
        request.onsuccess = function (evt) {
          db = evt.target.result;
          const loop_searchKeyArray = async () => {
            const promises_searchKeyArray = await [
              ...Array(searchKeyArray.length).keys(),
            ].map(async (idx) => {
              flagSearchKey = false;
              const tmp = new Promise((resolve, reject) => {
                dbSearch_searchKey(
                  idx,
                  searchKeyArray[idx],
                  searchKeyArray.length,
                  true
                ); // true -> mutation
              });
            });
            const results_searchKey = await Promise.all(
              promises_searchKeyArray
            );
            return results_searchKey;
          };
          loop_searchKeyArray();
        };
      } else {
        var request = indexedDB.open("keywordDict", DB_VERSION);
        request.onsuccess = function (evt) {
          db = evt.target.result;
          const loop_searchKeyArray = async () => {
            const promises_searchKeyArray = await [
              ...Array(searchKeyArray.length).keys(),
            ].map(async (idx) => {
              flagSearchKey = false;
              const tmp = new Promise((resolve, reject) => {
                dbSearch_searchKey(
                  idx,
                  searchKeyArray[idx],
                  searchKeyArray.length,
                  false
                ); // false -> first search
              });
            });
            const results_searchKey = await Promise.all(
              promises_searchKeyArray
            );
            return results_searchKey;
          };
          loop_searchKeyArray();
        };
        // });
      }
    });
  }
}

var secondWindow = document.createElement("secondWindow");
var secondQuestion = document.createElement("secondQuestion");

function secondIntervention(text) {
  var container = document.querySelector("[role='main']");
  if (container.firstChild) {
    var randNum = Math.floor(Math.random() * PICTORIAL_WARNING.length);
    var negConName = PICTORIAL_WARNING[randNum].substring(
      PICTORIAL_WARNING[randNum].indexOf("_") + 1,
      PICTORIAL_WARNING[randNum].lastIndexOf("_")
    );
    var negCon = PICTORIAL_WARNING_MSG[negConName];
    var imgSrc = chrome.runtime.getURL(
      `images/${PICTORIAL_WARNING[randNum]}.jpg`
    );
    var referAddr = WARNING_REFER[randNum];
    var detailText = PICTORIAL_WARNING_DESC[negConName];
    secondWindow.innerHTML = `
    <div class="intervention">
      <p class="warning_text">${negCon}</p>
      <p class="detail_text">${detailText}</p>
      <img class="warning_img" src=${imgSrc} />
      <p class="reference_text">reference: ${referAddr}</p>
      <p class="text">How about watching other videos?</p> 
      <button id="btn_no" class="intervention_button">No,</br>will watch it</button>
      <button id="btn_yes" class="yellow-button intervention_button">Yes, will watch</br>other videos</button>
    </div>
    `;
    container.parentElement.insertBefore(secondWindow, container);
    container.classList.add("intervention_overlay");
    secondWindow.classList.add("intervention_bg");
    document.querySelector("#btn_no").addEventListener("click", function () {
      // second question window
      // console.log("second question window");
      secondQuestion.innerHTML = `
        <div class="intervention">
        <p class="text">Nevertheless, why do you still want to watch</p>
        <p class="keyword">${text}?</p>
        <input class="survey_input" id="second_input" type="text" placeholder="Please wrtie the reason" autofocus></input><br>
        <button id="btn_submit" class="yellow-button intervention_button">Submit</button>
        </div>
      `;
      container.parentElement.insertBefore(secondQuestion, container);
      secondQuestion.classList.add("intervention_bg");
      document
        .querySelector("#btn_submit")
        .addEventListener("click", function () {
          if (!document.querySelector("#second_input").value) {
            alert("Please write the reason");
          } else {
            sendMsgToBack(null, "search_init", null, text);
            secondQuestion.remove();
            container.classList.remove("intervention_overlay");
            clearIntervention();
            // non food -> uncover
            if (document.querySelectorAll(".hide_contents")) {
              var tags = document.querySelectorAll(".hide_contents");
              for (var i = 0; i < tags.length; i++) {
                tags[i].classList.remove("hide_contents");
              }
            }
            hideContents("typeS", text);
          }
        });
      document
        .querySelector("#second_input")
        .addEventListener("keyup", function (event) {
          if (event.keyCode === 13) {
            event.preventDefault();
            document.querySelector("#btn_submit").click();
          }
        });
      secondWindow.remove();
    });
    document.querySelector("#btn_yes").addEventListener("click", function () {
      sendMsgToBack(null, "search_init", null, "");
      window.location.href = "http://www.youtube.com/";
      secondWindow.remove();
    });
  }
}

function clearIntervention() {
  if (document.querySelector("firstWindow")) {
    document.querySelector("firstWindow").remove();
  }
  if (document.querySelector("secondWindow")) {
    document.querySelector("secondWindow").remove();
  }
  if (document.querySelector("firstQuestion")) {
    document.querySelector("firstQuestion").remove();
  }
  if (document.querySelector("secondQuestion")) {
    document.querySelector("secondQuestion").remove();
  }
  if (document.querySelectorAll(".intervention_overlay")) {
    var tags = document.querySelectorAll(".intervention_overlay");
    for (var i = 0; i < tags.length; i++) {
      tags[i].classList.remove("intervention_overlay");
    }
  }
}

// postposition for dbsearch
var POSTPOSITION = {
  이: 1,
  가: 1,
  에서: 2,
  에게서: 3,
  부터: 2,
  까지: 2,
  와: 1,
  과: 1,
  을: 1,
  를: 1,
  의: 1,
  로: 1,
  으로: 2,
  은: 1,
  는: 1,
  "": 0,
  랑: 1,
  이랑: 2,
  같이: 2,
  처럼: 2,
  하고: 2,
  도: 1,
  이야: 2,
  야: 1,
  다: 1,
  이다: 2,
  이란: 2,
  이: 1,
  만: 1,
  집: 1,
  요리: 2,
  에는: 2,
  이죠: 2,
  밥: 1,
  에: 1,
  볶음: 2,
  구이: 2,
  튀김: 2,
  찌개: 2,
  국: 1,
  조림: 2,
  덮밥: 2,
  장: 1,
};

// DATA SET FOR PICTORIAL WARNING
var PICTORIAL_WARNING = [
  "m_anxiety_disorder_1",
  "m_anxiety_disorder_10",
  "m_anxiety_disorder_3",
  "m_anxiety_disorder_4",
  "m_anxiety_disorder_5",
  "m_anxiety_disorder_6",
  "m_anxiety_disorder_7",
  "m_anxiety_disorder_8",
  "m_depressive_disorder_1",
  "m_depressive_disorder_10",
  "m_depressive_disorder_11",
  "m_depressive_disorder_3",
  "m_depressive_disorder_4",
  "m_depressive_disorder_6",
  "m_depressive_disorder_7",
  "m_depressive_disorder_8",
  "m_depressive_disorder_9",
  "m_impulse_control_disorder_1",
  "m_impulse_control_disorder_10",
  "m_impulse_control_disorder_2",
  "m_impulse_control_disorder_3",
  "m_impulse_control_disorder_4",
  "m_impulse_control_disorder_5",
  "m_impulse_control_disorder_6",
  "m_impulse_control_disorder_7",
  "m_impulse_control_disorder_8",
  "m_impulse_control_disorder_9",
  "m_low_self_esteem_1",
  "m_low_self_esteem_5",
  "m_low_self_esteem_6",
  "m_low_self_esteem_9",
  "m_mood_disorder_1",
  "m_mood_disorder_10",
  "m_mood_disorder_2",
  "m_mood_disorder_3",
  "m_mood_disorder_4",
  "m_mood_disorder_5",
  "m_mood_disorder_6",
  "m_mood_disorder_7",
  "m_mood_disorder_8",
  "m_mood_disorder_9",
  "m_panic_attack_1",
  "m_panic_attack_10",
  "m_panic_attack_5",
  "m_panic_attack_7",
  "m_social_anxiety_1",
  "m_social_anxiety_2",
  "m_social_anxiety_4",
  "m_social_anxiety_6",
  "m_social_anxiety_8",
  "m_social_anxiety_9",
  "m_substance_use_disorder_1",
  "m_substance_use_disorder_3",
  "m_substance_use_disorder_5",
  "m_substance_use_disorder_7",
  "m_substance_use_disorder_8",
  "m_substance_use_disorder_9",
  "p_cavities_1",
  "p_cavities_10",
  "p_cavities_2",
  "p_cavities_3",
  "p_cavities_4",
  "p_cavities_5",
  "p_cavities_6",
  "p_cavities_8",
  "p_cavities_9",
  "p_dental_erosion_1",
  "p_dental_erosion_11",
  "p_dental_erosion_12",
  "p_dental_erosion_13",
  "p_dental_erosion_14",
  "p_dental_erosion_5",
  "p_dental_erosion_6",
  "p_dental_erosion_7",
  "p_diabetes_1",
  "p_diabetes_10",
  "p_diabetes_2",
  "p_diabetes_3",
  "p_diabetes_4",
  "p_diabetes_5",
  "p_diabetes_7",
  "p_diabetes_8",
  "p_dyslipidemia_1",
  "p_dyslipidemia_2",
  "p_dyslipidemia_3",
  "p_dyslipidemia_4",
  "p_dyslipidemia_10",
  "p_dyslipidemia_6",
  "p_dyslipidemia_7",
  "p_dyslipidemia_8",
  "p_dyslipidemia_9",
  "p_gastrointestinal_symptoms_1",
  "p_gastrointestinal_symptoms_10",
  "p_gastrointestinal_symptoms_2",
  "p_gastrointestinal_symptoms_3",
  "p_gastrointestinal_symptoms_5",
  "p_gastrointestinal_symptoms_7",
  "p_gastrointestinal_symptoms_9",
  "p_hypertension_1",
  "p_hypertension_2",
  "p_hypertension_3",
  "p_hypertension_5",
  "p_hypertension_7",
  "p_hypertension_8",
  "p_parotid_enlargement_1",
  "p_parotid_enlargement_10",
  "p_parotid_enlargement_2",
  "p_parotid_enlargement_4",
  "p_parotid_enlargement_7",
  "p_parotid_enlargement_8",
  "p_reduced_salivary_flow_rate_1",
  "p_reduced_salivary_flow_rate_2",
  "p_reduced_salivary_flow_rate_3",
  "p_reduced_salivary_flow_rate_5",
  "p_reduced_salivary_flow_rate_6",
  "p_reduced_salivary_flow_rate_8",
  "p_sleep_disorder_8",
  "p_sleep_disorder_1",
  "p_sleep_disorder_2",
  "p_sleep_disorder_4",
  "p_sleep_disorder_5",
  "p_sleep_disorder_6",
  "p_ulcer_1",
  "p_ulcer_10",
  "p_ulcer_2",
  "p_ulcer_3",
  "p_ulcer_4",
  "p_ulcer_5",
  "p_ulcer_6",
];

var WARNING_REFER = [
  "https://www.verywellmind.com/dsm-5-criteria-for-generalized-anxiety-disorder-1393147",
  "https://kormedi.com/1375684/%EB%B6%88%EC%95%88%EA%B0%90%EA%B3%BC-%EB%B6%88%EC%95%88%EC%9E%A5%EC%95%A0-%EC%96%B4%EB%96%BB%EA%B2%8C-%EB%8B%A4%EB%A5%BC%EA%B9%8C/",
  "https://www.homage.com.my/health/anxiety/",
  "https://www.uchealth.com/en/conditions/anxiety-disorder",
  "https://thehealthnexus.org/5-signs-you-should-talk-to-your-doctor-about-anxiety/",
  "https://www.simplypsychology.org/generalized-anxiety-disorder.html",
  "https://m.health.chosun.com/svc/news_view.html?contid=2016061501238",
  "https://www.healthinnews.co.kr/news/articleView.html?idxno=30120",
  "https://medicine.yonsei.ac.kr/health/encyclopedia/disease/body_board.do?mode=view&articleNo=66626&title=우울장애%28우울증%29+Depression+disorder",
  "https://m.health.chosun.com/svc/news_view.html?contid=2021011501996",
  "http://kormedi.com/1228489/우울증-유발하는-뜻밖의-원인-3/",
  "https://www.hankookilbo.com/News/Read/A2021041509290000151",
  "https://m.khan.co.kr/science/science-general/article/202111101013011#c2b",
  "https://kr.freepik.com/premium-vector/sad-tired-girl-suffers-of-depressive-disorder-stress-tears-vector-illustration-of-mental-problems_23324837.htm",
  "https://www.gettyimages.com/detail/photo/worried-woman-sitting-on-floor-next-to-bed-royalty-free-image/1091233350?adppopup=true",
  "https://www.freepik.com/free-vector/depression-concept-illustration_10386538.htm#query=depression%20illustration&position=0&from_view=keyword",
  "https://www.gettyimages.com/detail/photo/depressed-young-woman-sitting-on-the-street-royalty-free-image/1167553142?adppopup=true",
  "https://hathawayrecovery.com/impulsive-control-disorder/",
  "https://bodhiaddiction.com/impulse-control/",
  "https://www.psychologytoday.com/us/basics/impulse-control-disorders",
  "https://blog.virtunus.com/impulse-control-disorders/",
  "https://www.soberrecovery.com/addiction/7-ways-to-address-impulse-control-disorder/",
  "https://www.happynaru.com/bbs/board.php?bo_table=yp_adult06&wr_id=1",
  "http://mbiz.heraldcorp.com/view.php?ud=20150413000813",
  "https://m.moneys.mt.co.kr/article.html?no=2015041709068092603#_enliple",
  "https://m.gettyimagesbank.com/view/%ED%99%94-%ED%99%94-%EC%BB%A8%EC%85%89-%EB%B6%84%EB%85%B8%EC%A1%B0%EC%A0%88%EC%9E%A5%EC%95%A0/jv12274074",
  "http://www.psychiatricnews.net/news/articleView.html?idxno=31146",
  "https://kr.freepik.com/premium-vector/low-self-esteem-illustration_10841273.htm",
  "http://news.kmib.co.kr/article/print.asp?arcid=0923698707",
  "https://www.gettyimages.com/detail/illustration/young-man-looking-into-cracked-mirror-royalty-free-illustration/1285352741?adppopup=true",
  "https://newlifegenetics.com/how-genes-impact-our-psyche/",
  "https://www.nami.org/Blogs/NAMI-Blog/October-2020/What-People-Get-Wrong-About-Bipolar-Disorder",
  "http://www.mediadale.com/news/articleView.html?idxno=14316",
  "https://www.istockphoto.com/kr/벡터/양극성-장애-개념-여자는-행복하고-불행한-분위기와-두-얼굴-마스크를-보여줍니다-흰색으로-격리됩니다-조울증-양극성-질환-웹-정신-장애-배너-디자인-플랫-벡터-gm1331727676-414779540",
  "https://www.rosehillcenter.org/mental-health-blog/recognizing-bipolar-disorder-in-loved-ones/",
  "https://www.starhealth.in/blog/bipolar-disorder-symptoms-causes-treatment",
  "https://m.gettyimagesbank.com/view/choosing-mood-and-bipolar-disorder-concept/1353583668",
  "https://m.blog.naver.com/PostView.naver?isHttpsRedirect=true&blogId=wells05&logNo=220632981001",
  "https://m.blog.naver.com/PostView.naver?isHttpsRedirect=true&blogId=wells05&logNo=220632981001",
  "http://ydpsychiatry.com/?page_id=181",
  "https://www.freepik.com/premium-vector/bipolar-disorder-woman-suffers-from-hormonal-with-change-mood-mental-health-vector-illustration_16252871.htm?query=mood%20disorder",
  "https://www.verywellmind.com/top-symptoms-of-panic-attacks-2584270",
  "https://www.freepik.com/free-vector/isometric-compositions-set-panic-attack-people_13749471.htm#query=panic%20attack&position=0&from_view=keyword",
  "https://www.medicinenet.com/panic_disorder/article.htm",
  "https://kormedi.com/1283840/%EA%B3%B5%ED%99%A9-%EB%B0%9C%EC%9E%91-%ED%99%98%EC%9E%90-%EB%8F%95%EB%8A%94-7%EA%B0%80%EC%A7%80-%EB%B0%A9%EB%B2%95/",
  "https://medicalchannelasia.com/understanding-social-anxiety-disorder/",
  "https://www.forbes.com/health/mind/what-is-social-anxiety-disorder/",
  "https://therapy-central.com/what-we-do/social-anxiety-disorder-treatment-london/",
  "https://www.freepik.com/free-vector/social-anxiety-concept-illustration_10385327.htm#query=social%20anxiety&position=5&from_view=search",
  "https://www.freepik.com/free-vector/social-anxiety-concept-illustration_10385326.htm#query=social%20anxiety&position=0&from_view=search",
  "https://realvitamins.com/social-anxiety-disorder/",
  "https://www.drugtargetreview.com/news/101934/findings-reveal-possible-connection-to-substance-use-disorders-and-metabolic-dysfunctions/",
  "https://steptohealth.co.kr/what-to-do-about-medication-poisoning/",
  "https://m.post.naver.com/viewer/postView.naver?volumeNo=5715181&memberNo=15523773&vType=VERTICAL",
  "https://www.northernillinoisrecovery.com/what-is-substance-use-disorder/",
  "https://www.hkn24.com/news/articleView.html?idxno=313390",
  "https://indianexpress.com/article/lifestyle/health/world-health-day-2017-substance-abuse-worsens-depression-experts-say-4603642/",
  "https://www.researchgate.net/publication/232801694_Tooth_surface_loss_Eating_disorders_and_the_dentist/references",
  "https://dg-dentistry.com/four-facts-you-may-not-know-about-cavities/",
  "https://www.clarencetam.co.nz/exposed_cavities_between_front_teeth___aacd_cosmetic_dentis/",
  "https://www.clarencetam.co.nz/social-six-smile-reconstruction/",
  "https://www.clarencetam.co.nz/class-v-cavities/",
  "https://www.nature.com/articles/vital840",
  "https://www.nature.com/articles/bdj.2007.682",
  "https://www.nature.com/articles/bdj.2007.682",
  "https://lakefrontfamilydentistry.com/tooth-cavity/",
  "https://www.clarencetam.co.nz/acid-erosion-from-sports-drinks/",
  "https://www.sciencedirect.com/science/article/pii/S0022391316001554",
  "https://www.sciencedirect.com/science/article/pii/S0022391316001554",
  "https://www.sciencedirect.com/science/article/pii/S0022391316001554",
  "https://www.sciencedirect.com/science/article/pii/S0022391316001554",
  "https://www.mdpi.com/1660-4601/17/9/3002/htm",
  "https://europepmc.org/article/med/12617031",
  "https://www.tandlakartidningen.se/media/1569/Johansson_4_2005.pdf",
  "https://www.footankleinstitute.com/blog/diabetic-foot-ulcer/",
  "https://www.diabetes.co.uk/insulin/diabetes-and-injecting-insulin.html",
  "https://tiprelay.com/what-are-the-symptoms-and-signs-of-diabetes/",
  "https://www.yesonhospital.com/bbs/board.php?bo_table=medical_info&wr_id=719&sca=족부센터&device_view=pc",
  "http://m.segyebiz.com/newsView/20210213505946",
  "https://diabetes.co.in/what-is-diabetes-dermopathy/",
  "https://www.gettyimages.com/detail/photo/midsection-of-woman-testing-blood-sugar-royalty-free-image/1128962457",
  "https://www.medicalnewstoday.com/articles/326191",
  "https://www.asiae.co.kr/news/print.htm?idxno=2013091012374365468&udt=1",
  "https://blog.naver.com/PostView.nhn?blogId=mohw2016&logNo=221085688139&parentCategoryNo=&categoryNo=64&viewDate=&isShowPopularPosts=false&from=postView",
  "https://blog.phytoway.com/혈액-속-기름때-고지혈증-진단법/",
  "https://www.amc.seoul.kr/asan/mobile/healthstory/medicalcolumn/medicalColumnDetail.do?medicalColumnId=34059",
  "http://kormedi.com/1279875/고지혈증-자세히/",
  "https://hanclinic.co.kr/47",
  "https://www.hanam.go.kr/health/contents.do?key=939",
  "https://www.youtube.com/watch?v=dv-onOzufPA",
  "http://easy-read.or.kr/bbs/bbs_view.php?code=makeImage&idx=2790&page=5&search_cate1=%EC%9D%BC%EB%9F%AC%EC%8A%A4%ED%8A%B8&search_cate2=&keyword=",
  "https://www.istockphoto.com/kr/일러스트/gastritis",
  "https://www.gettyimages.com/detail/photo/abdominal-pain-patient-woman-having-medical-exam-royalty-free-image/1248393962",
  "https://www.mountelizabeth.com.sg/healthplus/article/common-digestive-problems",
  "https://www.mountelizabeth.com.sg/healthplus/article/common-digestive-problems",
  "https://m.blog.naver.com/nabypc/140167788799",
  "https://m.post.naver.com/viewer/postView.naver?volumeNo=32384569&memberNo=4659776",
  "https://stock.adobe.com/kr/images/men-have-abdominal-pain-with-knot-in-stomach-on-isolated-illustration-about-indigestion-symptom-and-gastrointestinal/167124111?as_campaign=ftmigration2&as_channel=dpcft&as_campclass=brand&as_source=ft_web&as_camptype=acquisition&as_audience=users&as_content=closure_asset-detail-page",
  "https://m.blog.naver.com/0178lg1/220557712810",
  "https://www.junsungki.com/magazine/post-detail.do?id=3581&group=HEALTH",
  "https://m.health.chosun.com/svc/news_view.html?contid=2020112301183",
  "https://www.freepik.com/vectors/high-blood-pressure",
  "https://www.heart.org/en/health-topics/high-blood-pressure/health-threats-from-high-blood-pressure",
  "https://www.gettyimages.com/detail/photo/mature-woman-wearing-a-mask-with-a-headache-asks-royalty-free-image/1282030512",
  "https://www.researchgate.net/publication/232801694_Tooth_surface_loss_Eating_disorders_and_the_dentist/references",
  "http://www.ajnr.org/content/ajnr/16/5/1128.full.pdf",
  "https://europepmc.org/article/pmc/pmc5878158",
  "http://sports.hankooki.com/news/articleView.html?idxno=6541391",
  "https://thejcdp.com/doi/JCDP/pdf/10.5005/jcdp-6-1-136",
  "https://www.sciencedirect.com/science/article/pii/S1043181008000742?via%3Dihub",
  "https://link.springer.com/chapter/10.1007/978-3-030-15432-5_9",
  "https://www.sciencedirect.com/science/article/abs/pii/S0002817714627380",
  "https://pharmaceutical-journal.com/article/ld/dry-mouth-advice-and-management",
  "https://www.oralmaxsurgery.theclinics.com/article/S1042-3699%2813%2900112-X/fulltext",
  "https://onlinelibrary.wiley.com/doi/full/10.1111/jtxs.12575",
  "https://www.nature.com/articles/4812740",
  "https://www.istockphoto.com/kr/사진/불면증-수-면-무-호흡-증-또는-스트레스-고통-불면-여자-피곤-하-고-지친-여자입니다-두통-또는-편두통-한밤중에-깨어-문제가-있는-사람을-좌절-알람-시계-gm1140559999-305259729?phrase=sleep%20disorder",
  "https://www.istockphoto.com/kr/사진/불면증-수-면-무-호흡-증-또는-스트레스-고통-불면-여자-피곤-하-고-지친-여자입니다-두통-또는-편두통-한밤중에-깨어-문제가-있는-사람을-좌절-알람-시계-gm1140559999-305259729?phrase=sleep%20disorder",
  "https://www.istockphoto.com/kr/사진/불면증-수-면-무-호흡-증-또는-스트레스-고통-불면-여자-피곤-하-고-지친-여자입니다-두통-또는-편두통-한밤중에-깨어-문제가-있는-사람을-좌절-알람-시계-gm1140559999-305259729?phrase=sleep%20disorder",
  "https://www.istockphoto.com/kr/사진/불면증-수-면-무-호흡-증-또는-스트레스-고통-불면-여자-피곤-하-고-지친-여자입니다-두통-또는-편두통-한밤중에-깨어-문제가-있는-사람을-좌절-알람-시계-gm1140559999-305259729?phrase=sleep%20disorder",
  "https://www.istockphoto.com/kr/사진/불면증-수-면-무-호흡-증-또는-스트레스-고통-불면-여자-피곤-하-고-지친-여자입니다-두통-또는-편두통-한밤중에-깨어-문제가-있는-사람을-좌절-알람-시계-gm1140559999-305259729?phrase=sleep%20disorder",
  "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.yoomd.co.kr%2F35%2F8962691&psig=AOvVaw0ZDOoiWJ1J8WlUuv3pjl48&ust=1657958928014000&source=images&cd=vfe&ved=0CAwQjRxqFwoTCKi0zrq4-vgCFQAAAAAdAAAAABAI",
  "https://www.researchgate.net/publication/344549843_Case_and_Review_Amoxycillin-Clavulanic_Acid-Induced_Esophageal_Ulcer_An_Unusual_Cause",
  "https://www.gettyimages.com/detail/illustration/peptic-ulcer-artwork-royalty-free-illustration/488635729",
  "https://cdn.mdedge.com/files/s3fs-public/issues/articles/jcom02706281.pdf",
  "https://www.researchgate.net/publication/290433223_Old_technique_revisited_with_surgical_innovation_complicated_Mallory-Weiss_tear_with_bleeding_gastric_ulcer_exclusion",
  "https://emedicine.medscape.com/article/181753-workup",
  "https://www.sages.org/image-library/duodenal-ulcer/",
  "https://news.imaeil.com/page/view/2020010917463118576",
];

var PICTORIAL_WARNING_MSG = {
  anxiety_disorder: "Binge eating can lead to <b>anxiety disorders</b>.",
  depressive_disorder: "Binge eating can lead to <b>depressive disorders</b>.",
  low_self_esteem: "Binge eating can lead to <b>low self-esteem</b>.",
  mood_disorder: "Binge eating can lead to <b>mood disorders</b>.",
  panic_attack: "Binge eating can lead to <b>panic attacks</b>.",
  sleep_disorder: "Binge eating can lead to <b>sleep disorders</b>.",
  social_anxiety: "Binge eating can lead to <b>social anxiety disorder</b>.",
  substance_use_disorder:
    "Binge eating can lead to <b>substance use disorder</b>.",
  dental_erosion: "Binge eating can lead to <b>dental erosion</b>.",
  diabetes: "Binge eating can lead to <b>Type 2 diabetes</b>.",
  dyslipidemia: "Binge eating can lead to <b>dyslipidemia</b>.",
  hypertension: "Binge eating can lead to <b>hypertension</b>.",
  parotid_enlargement:
    "Binge eating can lead to <b>parotid gland enlargement</b>.",
  reduced_salivary_flow_rate: "Binge eating can lead to <b>dry mouth</b>.",
  ulcer: "Binge eating can lead to <b>gastric ulcers</b>.",
  cavities: "Binge eating can lead to <b>cavities</b>.",
  impulse_control_disorder:
    "Binge eating can lead to <b>impulse control disorder</b>.",
  gastrointestinal_symptoms:
    "Binge eating can lead to <b>gastrointestinal disorders</b>.",
};

var PICTORIAL_WARNING_DESC = {
  anxiety_disorder:
    "A mental disorder characterized by various forms of abnormal and pathological anxiety and fear, leading to disruptions in daily life.",
  depressive_disorder:
    "A disorder that primarily manifests as decreased motivation and persistent feelings of sadness, leading to cognitive, psychological, and physical symptoms that impair daily functioning.",
  low_self_esteem:
    "Low self-esteem makes it difficult to love oneself and recognize one's own value.",
  mood_disorder:
    "A condition where extreme mood swings cause severe fatigue, loss of will to live, and feelings of despair.",
  panic_attack:
    "A sudden and unexpected episode of intense anxiety without any apparent reason.",
  sleep_disorder:
    "A condition where individuals struggle to maintain healthy sleep patterns or experience disrupted sleep rhythms, leading to difficulties during waking hours.",
  social_anxiety:
    "An extreme fear or anxiety when exposed to social situations (e.g., talking to strangers, eating or drinking in public, giving speeches or presentations).",
  substance_use_disorder:
    "A condition where individuals lose control over the use of substances such as alcohol, tobacco, or prescription drugs, continuing their use despite negative consequences at home or work.",
  dental_erosion:
    "Stomach acid from vomiting dissolves the enamel on the tooth surface, leading to dental erosion and shortened teeth.",
  diabetes:
    "Unhealthy eating habits impair insulin function in the body, reducing the pancreas's ability to secrete insulin properly, which can lead to diabetes.",
  dyslipidemia:
    "Excessive fat buildup in blood vessels due to binge eating can trigger inflammatory responses, leading to dyslipidemia.",
  hypertension:
    "During binge eating, a sudden increase in blood flow to the digestive tract can lead to hypertension.",
  parotid_enlargement:
    "Binge eating and vomiting stimulate the salivary glands, causing their tissues to enlarge, which may result in parotid gland enlargement.",
  reduced_salivary_flow_rate:
    "Dry foods, acidic foods, caffeine, and alcohol can cause dehydration, leading to dry mouth.",
  ulcer:
    "The balance of the stomach is disrupted due to binge eating and vomiting, leading to damage in the stomach lining and the development of ulcers.",
  cavities:
    "Carbohydrates serve as a nutrient source for oral bacteria, increasing acidity in the mouth and leading to cavities.",
  impulse_control_disorder:
    "A mental disorder characterized by repeated harmful behaviors towards oneself or others and an inability to control these impulses and desires.",
  gastrointestinal_symptoms:
    "Irregular and unhealthy eating habits can lead to gastrointestinal disorders, causing symptoms such as heartburn, bloating, vomiting, indigestion, and stomach gurgling.",
};
