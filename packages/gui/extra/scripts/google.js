// ==UserScript==
// @name         google增强
// @version      1.2.4
// @author       Greper
// @description  去除ping链接
// @match        https://www.google.com/*/*
// @icon         https://www.google.com/favicon.ico
// @license      GPL-3.0 License
// @run-at       document-end
// @namespace
// ==/UserScript==

(function () {
  console.log('google script  loaded')
  const aList = document.getElementsByTagName('a')
  for (let i = 0; i <= aList.length; i++) {
    console.log(aList[i].href)
    aList[i].ping = undefined
  }
})()
