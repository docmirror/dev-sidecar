/**
 * 当前脚本复制了 `https://github.com/XIU2/UserScript/blob/master/GithubEnhanced-High-Speed-Download.user.js`，并进行了修改和优化，以兼容 `./tampermonkey.js`。
 * 非常感谢 `Github油猴脚本` 的作者 `X.I.U`，提供了如此优秀的脚本。👍
 *
 * @name            Github 增强 - 高速下载（Github油猴脚本）
 * @name:en         Github Enhancement - High Speed Download（Github Greasemonkey Script）
 * @version         2.6.33
 * @since           2025-09-04 11:24
 * @author          X.I.U
 * @description     High-speed download of Git Clone/SSH, Release, Raw, Code(ZIP) and other files (Based on public welfare), project list file quick download (☁)
 * @description:zh-CN  高速下载 Git Clone/SSH、Release、Raw、Code(ZIP) 等文件 (公益加速)、项目列表单文件快捷下载 (☁)
 * @description:zh-TW  高速下載 Git Clone/SSH、Release、Raw、Code(ZIP) 等文件 (公益加速)、項目列表單文件快捷下載 (☁)
 * @license         GPL-3.0 License
 * @namespace       https://greasyfork.org/scripts/412245
 * @supportURL      https://github.com/XIU2/UserScript
 * @homepageURL     https://github.com/XIU2/UserScript
 * @sourceURL       https://github.com/XIU2/UserScript/blob/master/GithubEnhanced-High-Speed-Download.user.js
 */
const ds_github_monkey_version = "2.6.33_1";
document.addEventListener("DOMContentLoaded", () => {
	const DS_init = (window.__ds_global__ || {})['DS_init']
	if (typeof DS_init === 'function') {
		const options = {
			name: "Github 增强 - 高速下载",
			icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAACEUExURUxpcRgWFhsYGBgWFhcWFh8WFhoYGBgWFiUlJRcVFRkWFhgVFRgWFhgVFRsWFhgWFigeHhkWFv////////////r6+h4eHv///xcVFfLx8SMhIUNCQpSTk/r6+jY0NCknJ97e3ru7u+fn51BOTsPCwqGgoISDg6empmpoaK2srNDQ0FhXV3eXcCcAAAAXdFJOUwCBIZXMGP70BuRH2Ze/LpIMUunHkpQR34sfygAAAVpJREFUOMt1U+magjAMDAVb5BDU3W25b9T1/d9vaYpQKDs/rF9nSNJkArDA9ezQZ8wPbc8FE6eAiQUsOO1o19JolFibKCdHGHC0IJezOMD5snx/yE+KOYYr42fPSufSZyazqDoseTPw4lGJNOu6LBXVUPBG3lqYAOv/5ZwnNUfUifzBt8gkgfgINmjxOpgqUA147QWNaocLniqq3QsSVbQHNp45N/BAwoYQz9oUJEiE4GMGfoBSMj5gjeWRIMMqleD/CAzUHFqTLyjOA5zjNnwa4UCEZ2YK3khEcBXHjVBtEFeIZ6+NxYbPqWp1DLKV42t6Ujn2ydyiPi9nX0TTNAkVVZ/gozsl6FbrktkwaVvL2TRK0C8Ca7Hck7f5OBT6FFbLATkL2ugV0tm0RLM9fedDvhWstl8Wp9AFDjFX7yOY/lJrv8AkYuz7fuP8dv9izCYH+x3/LBnj9fYPBTpJDNzX+7cAAAAASUVORK5CYII=",
			width: 300
		}
		console.log(`ds_github_monkey_${ds_github_monkey_version}: do ds_tampermonkey.DS_init, options:`, options)
		DS_init(options)
	} else {
		console.log(`ds_github_${ds_github_monkey_version}: has no DS_init`)
	}

	if (!((window.__ds_global__ || {}).GM_getValue || (() => true))("ds_enabled", true)) {
		console.log(`ds_github_monkey_${ds_github_monkey_version}: tampermonkey disabled`)
		return
	}

	const GM_registerMenuCommand = (window.__ds_global__ || {})['GM_registerMenuCommand'] || (() => {})
	const GM_unregisterMenuCommand = (window.__ds_global__ || {})['GM_unregisterMenuCommand'] || (() => {})
	const GM_openInTab = (window.__ds_global__ || {})['GM_openInTab'] || (() => {})
	const GM_getValue = (window.__ds_global__ || {})['GM_getValue'] || (() => {})
	const GM_setValue = (window.__ds_global__ || {})['GM_setValue'] || (() => {})
	const GM_notification = (window.__ds_global__ || {})['GM_notification'] || (() => {});
	const GM_setClipboard = (window.__ds_global__ || {})['GM_setClipboard'] || (() => {});
	const DS_hidePlugin = (window.__ds_global__ || {})['hidePlugin'] || (() => {});

	(function() {
		'use strict';
		var menu_rawFast = GM_getValue('xiu2_menu_raw_fast'), menu_rawFast_ID, menu_rawDownLink_ID, menu_gitClone_ID, menu_customUrl_ID, menu_feedBack_ID, menu_hideShortcut_ID, menu_showShortcut_ID;
		const download_url_us = [
			['https://gh.h233.eu.org/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [@X.I.U/XIU2] 提供'],
			//['https://gh.api.99988866.xyz/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [github.com/hunshcn/gh-proxy] 提供'], // 官方演示站用的人太多了
			//['https://ghproxy.1888866.xyz/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [WJQSERVER-STUDIO/ghproxy] 提供'],//挂了
			['https://rapidgit.jjda.de5.net/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [热心网友] 提供'],
			['https://gh.ddlc.top/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [@mtr-static-official] 提供'], // Error 1027
			//['https://gh2.yanqishui.work/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [@HongjieCN] 提供'], // 错误
			//['https://dl.ghpig.top/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [feizhuqwq.com] 提供'], // ERR_SSL_VERSION_OR_CIPHER_MISMATCH
			//['https://gh.flyinbug.top/gh/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [Mintimate] 提供'], // 错误
			//['https://gh.con.sh/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh.con.sh] 提供'], // Suspent due to abuse report.
			//['https://ghps.cc/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [ghps.cc] 提供'], // 提示 blocked
			['https://gh-proxy.org/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh-proxy.com] 提供'],
			//['https://hk.gh-proxy.org/https://github.com', '其他', '[中国香港] - 该公益加速源由 [gh-proxy.com] 提供'],
			['https://cdn.gh-proxy.org/https://github.com', '其他', '[Fastly CDN] - 该公益加速源由 [gh-proxy.com] 提供'],
			['https://edgeone.gh-proxy.org/https://github.com', '其他', '[edgeone] - 该公益加速源由 [gh-proxy.com] 提供'],
			['https://cors.isteed.cc/github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [@Lufs\'s] 提供'],
			['https://hub.gitmirror.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [GitMirror] 提供'],
			//['https://down.sciproxy.com/github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [sciproxy.com] 提供'], // 522
			['https://ghproxy.it/https://github.com', '美国', '[美国 洛杉矶] - 该公益加速源由 [@yionchilau] 提供'],
			//['https://github.site', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [@yionchilau] 提供'], // 挂了
			//['https://github.store', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [@yionchilau] 提供'], // 挂了
			//['https://gh.jiasu.in/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [@0-RTT] 提供'], // 404
			['https://github.boki.moe/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [blog.boki.moe] 提供'],
			//['https://github.moeyy.xyz/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [moeyy.cn] 提供'], // 墙了
			['https://gh-proxy.net/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh-proxy.net] 提供'],
			//['https://github.yongyong.online/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [github.yongyong.online] 提供'], // 空白
			//['https://ghdd.862510.xyz/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [ghdd.862510.xyz] 提供'], // turnstile token missing
			['https://gh.jasonzeng.dev/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh.jasonzeng.dev] 提供'],
			['https://gh.monlor.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh.monlor.com] 提供'],
			['https://fastgit.cc/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [fastgit.cc] 提供'],
			['https://github.tbedu.top/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [github.tbedu.top] 提供'],
			//['https://github.geekery.cn/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [github.geekery.cn] 提供'], // 下载认证信息 用户名：123123 密　码：123123
			['https://firewall.lxstd.org/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [firewall.lxstd.org] 提供'],
			['https://github.ednovas.xyz/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [github.ednovas.xyz] 提供'],
			['https://ghfile.geekertao.top/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [ghfile.geekertao.top] 提供'],
			['https://ghp.keleyaa.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [ghp.keleyaa.com] 提供'], // Error 1027
			//['https://github.wuzhij.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [github.wuzhij.com] 提供'], // 404
			['https://gh.chjina.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh.chjina.com] 提供'],
			['https://ghpxy.hwinzniej.top/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [ghpxy.hwinzniej.top] 提供'],
			['https://cdn.crashmc.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [cdn.crashmc.com] 提供'],
			['https://git.yylx.win/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [git.yylx.win] 提供'],
			['https://gitproxy.mrhjx.cn/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gitproxy.mrhjx.cn] 提供'],
			['https://ghproxy.cxkpro.top/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [ghproxy.cxkpro.top] 提供'],
			['https://gh.xxooo.cf/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh.xxooo.cf] 提供'],
			['https://github.limoruirui.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [github.limoruirui.com] 提供'],
			['https://gh.idayer.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh.idayer.com] 提供'], // Error 1027
			//['https://gh.zwnes.xyz/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh.zwnes.xyz] 提供'], // 超时
			['https://gh.llkk.cc/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh.llkk.cc] 提供'],
			['https://down.npee.cn/?https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [npee社区] 提供'],
			['https://raw.ihtw.moe/github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [raw.ihtw.moe] 提供'],
			['https://xget.xi-xu.me/gh', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [github.com/xixu-me/Xget] 提供'],
			['https://dgithub.xyz', '美国', '[美国 西雅图] - 该公益加速源由 [dgithub.xyz] 提供'],
			//['https://gh-proxy.ygxz.in/https://github.com', '美国', '[美国 洛杉矶] - 该公益加速源由 [@一个小站 www.ygxz.in] 提供'], // 被蔷
			['https://gh.nxnow.top/https://github.com', '美国', '[美国 洛杉矶] - 该公益加速源由 [gh.nxnow.top] 提供'],
			['https://gh.zwy.one/https://github.com', '美国', '[美国 洛杉矶] - 该公益加速源由 [gh.zwy.one] 提供'],
			['https://ghproxy.monkeyray.net/https://github.com', '美国', '[美国 洛杉矶] - 该公益加速源由 [ghproxy.monkeyray.net] 提供'],
			['https://gh.xx9527.cn/https://github.com', '美国', '[美国 洛杉矶] - 该公益加速源由 [gh.xx9527.cn] 提供'],
		], download_url = [
			//['https://ghproxy.net/https://github.com', '英国', '[英国伦敦] - 该公益加速源由 [ghproxy.net] 提供&#10;&#10;提示：希望大家尽量多使用美国节点（每次随机 负载均衡），&#10;避免流量都集中到亚洲公益节点，减少成本压力，公益才能更持久~'], // 挂了
			['https://ghfast.top/https://github.com', '韩国', '[日本、韩国、新加坡、美国、德国等]（CDN 不固定） - 该公益加速源由 [ghproxy.link] 提供&#10;&#10;提示：希望大家尽量多使用美国节点（每次随机 负载均衡），&#10;避免流量都集中到亚洲公益节点，减少成本压力，公益才能更持久~'],
			['https://wget.la/https://github.com', '台湾', '[中国香港、中国台湾、日本、美国等]（CDN 不固定） - 该公益加速源由 [ucdn.me] 提供&#10;&#10;提示：希望大家尽量多使用美国节点（每次随机 负载均衡），&#10;避免流量都集中到亚洲公益节点，减少成本压力，公益才能更持久~'],
			//['https://hub.glowp.xyz/https://github.com', '其他', '[中国香港] - 该公益加速源由 [hub.glowp.xyz] 提供&#10;&#10;提示：希望大家尽量多使用美国节点（每次随机 负载均衡），&#10;避免流量都集中到亚洲公益节点，减少成本压力，公益才能更持久~'],
			//['https://kkgithub.com', '其他', '[中国香港、日本、韩国、新加坡等] - 该公益加速源由 [help.kkgithub.com] 提供&#10;&#10;提示：希望大家尽量多使用美国节点（每次随机 负载均衡），&#10;避免流量都集中到亚洲公益节点，减少成本压力，公益才能更持久~'], // 404
		], clone_url = [
			['https://gitclone.com', '国内', '[中国 国内] - 该公益加速源由 [GitClone] 提供&#10;&#10; - 缓存：有&#10; - 首次比较慢，缓存后较快'],
			['https://kkgithub.com', '香港', '[中国香港、日本、新加坡等] - 该公益加速源由 [help.kkgithub.com] 提供'],
			//['https://gitdl.cn/https://github.com', '香港', '[中国香港] - 该公益加速源由 [gitdl] 提供'], // 输出文件错误
			//['https://gitproxy.click/https://github.com', '香港', '[中国 香港] - 该公益加速源由 [gitproxy.click] 提供'],
			//['https://cdn.moran233.xyz/https://github.com', '香港', '[中国 香港] - 该公益加速源由 [cdn.moran233.xyz] 提供'],
			//['https://hub.glowp.xyz/https://github.com', '香港', '[中国香港] - 该公益加速源由 [hub.glowp.xyz] 提供'],
			['https://wget.la/https://github.com', '香港', '[中国香港、中国台湾、日本、美国等]（CDN 不固定） - 该公益加速源由 [ucdn.me] 提供'],
			['https://hk.gh-proxy.org/https://github.com', '香港', '[中国香港] - 该公益加速源由 [gh-proxy.com] 提供'],
			['https://ghfast.top/https://github.com', '韩国', '[日本、韩国、新加坡、美国、德国等]（CDN 不固定） - 该公益加速源由 [ghproxy] 提供'],
			//['https://gh.catmak.name/https://raw.githubusercontent.com', '韩国', '[韩国 首尔] - 该公益加速源由 [gh.catmak.name] 提供'],
			['https://githubfast.com', '韩国', '[韩国] - 该公益加速源由 [Github Fast] 提供'],
			//['https://ghproxy.net/https://github.com', '日本', '[日本 大阪] - 该公益加速源由 [ghproxy.net] 提供'], // 挂了
			//['https://proxy.yaoyaoling.net/https://github.com', '日本', '[日本 东京] - 该公益加速源由 [proxy.yaoyaoling.net] 提供'],
			//['https://g.blfrp.cn/https://github.com', '日本', '[日本 东京] - 该公益加速源由 [g.blfrp.cn] 提供'],
			//['https://github.3x25.com/https://github.com', '新加坡', '[新加坡] - 该公益加速源由 [github.3x25.com] 提供'],
			//['https://raw.bgithub.xyz', '荷兰', '[荷兰] - 该公益加速源由 [bgithub.xyz] 提供&#10;&#10; - 缓存：有'],
			//['https://ghproxy.1888866.xyz/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [WJQSERVER-STUDIO/ghproxy] 提供'],
			//['https://github.moeyy.xyz/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [moeyy.cn] 提供'], // 墙了
			//['https://gh-proxy.net/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh-proxy.net] 提供'],
			//['https://rapidgit.jjda.de5.net/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [热心网友] 提供'],
			//['https://github.yongyong.online/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [github.yongyong.online] 提供'],
			//['https://ghdd.862510.xyz/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [ghdd.862510.xyz] 提供'],
			//['https://hub.gitmirror.com/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [GitMirror] 提供'],
			//['https://gh-proxy.org/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh-proxy.com] 提供'],
			//['https://cdn.gh-proxy.org/https://github.com', '其他', '[Fastly CDN] - 该公益加速源由 [gh-proxy.com] 提供'],
			//['https://edgeone.gh-proxy.org/https://github.com', '其他', '[edgeone] - 该公益加速源由 [gh-proxy.com] 提供'],
			//['https://ghproxy.it/https://github.com', '美国', '[美国 洛杉矶] - 该公益加速源由 [@yionchilau] 提供'],
			//['https://github.site', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [@yionchilau] 提供'], // 挂了
			//['https://github.store', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [@yionchilau] 提供'], // 挂了
			//['https://gh.jiasu.in/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [@0-RTT] 提供'], // 404
			//['https://github.boki.moe/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [blog.boki.moe] 提供'],
			//['https://raw.ihtw.moe/github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [raw.ihtw.moe] 提供'],
			//['https://xget.xi-xu.me/gh', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [github.com/xixu-me/Xget] 提供'],
			//['https://dgithub.xyz', '美国', '[美国 西雅图] - 该公益加速源由 [dgithub.xyz] 提供'],
			//['https://gh-proxy.ygxz.in/https://github.com', '美国', '[美国 洛杉矶] - 该公益加速源由 [@一个小站 www.ygxz.in] 提供'], // 被蔷
			//['https://hub.scholar.rr.nu', '美国', '[美国 纽约] - 该公益加速源由 [FastGit 群组成员] 提供'], // 证书到期
		], clone_ssh_url = [
			['ssh://git@ssh.github.com:443/', 'Github 原生', '[日本、新加坡等] - Github 官方提供的 443 端口的 SSH（依然是 SSH 协议），适用于限制访问 22 端口的网络环境'],
			//['git@ssh.fastgit.org:', '香港', '[中国 香港] - 该公益加速源由 [FastGit] 提供'], // 挂了
			//['git@git.zhlh6.cn:', '美国', '[美国 洛杉矶]'] // 挂了
		], raw_url = [
			['https://raw.githubusercontent.com', 'Github 原生', '[日本 东京]&#10;&#10; - 缓存：无（或很短）'],
			['https://raw.kkgithub.com', '香港 1', '[中国香港、日本、新加坡等] - 该公益加速源由 [help.kkgithub.com] 提供&#10;&#10; - 缓存：有'],
			//['https://jsd.proxy.aks.moe/gh', '香港 2', '[中国 香港] - 该公益加速源由 [cdn.akass.cn] 提供'], // 证书错误
			['https://wget.la/https://raw.githubusercontent.com', '香港 2', '[中国香港、中国台湾、日本、美国等]（CDN 不固定） - 该公益加速源由 [ucdn.me] 提供&#10;&#10; - 缓存：无（或很短）'],
			['https://hk.gh-proxy.org/https://raw.githubusercontent.com', '香港 3', '[中国香港] - 该公益加速源由 [gh-proxy.com] 提供&#10;&#10; - 缓存：有（官方注明 2 小时）'],
			['https://hub.glowp.xyz/https://raw.githubusercontent.com', '香港 4', '[中国香港] - 该公益加速源由 [hub.glowp.xyz] 提供&#10;&#10; - 缓存：有'],
			//['https://cdn.wget.la/gh', '香港 2', '[中国香港、中国台湾、日本、美国等]（CDN 不固定） - 该公益加速源由 [ucdn.me] 提供&#10;&#10; - 缓存：无（或很短）'],
			//['https://gitproxy.click/https://raw.githubusercontent.com', '香港', '[中国 香港] - 该公益加速源由 [gitproxy.click] 提供'], // 输出错误
			//['https://cdn.moran233.xyz/https://raw.githubusercontent.com', '香港', '[中国 香港] - 该公益加速源由 [cdn.moran233.xyz] 提供'], // 404
			//['https://gitdl.cn/https://raw.githubusercontent.com', '香港 3', '[中国香港] - 该公益加速源由 [gitdl] 提供&#10;&#10; - 缓存：有'], // 输出文件错误
			['https://ghfast.top/https://raw.githubusercontent.com', '韩国', '[日本、韩国、新加坡、美国、德国等]（CDN 不固定） - 该公益加速源由 [ghproxy.link] 提供&#10;&#10; - 缓存：无（或很短）'],
			['https://gh.catmak.name/https://raw.githubusercontent.com', '韩国', '[韩国 首尔] - 该公益加速源由 [gh.catmak.name] 提供'],
			//['https://ghproxy.net/https://raw.githubusercontent.com', '日本 1', '[日本 大阪] - 该公益加速源由 [ghproxy.net] 提供&#10;&#10; - 缓存：有（约 10 分钟）'], // 挂了
			['https://fastly.jsdelivr.net/gh', '日本 1', '[日本 东京] - 该公益加速源由 [JSDelivr CDN] 提供&#10;&#10; - 缓存：有&#10; - 不支持大小超过 50 MB 的文件&#10; - 不支持版本号格式的分支名（如 v1.2.3）'],
			['https://cdn.gh-proxy.org/https://raw.githubusercontent.com', '日本 2', '[Fastly CDN] - 该公益加速源由 [gh-proxy.com] 提供&#10;&#10; - 缓存：有'],
			//['https://jsdelivr.pai233.top/gh', '日本 3', '[日本 东京]（Vercel Anycast） - 该公益加速源由 [blog.pai233.top] 提供&#10;&#10; - 缓存：有'], // This deployment is temporarily paused
			//['https://proxy.yaoyaoling.net/https://raw.githubusercontent.com', '日本', '[日本 东京] - 该公益加速源由 [proxy.yaoyaoling.net] 提供'], // 空白
			['https://g.blfrp.cn/https://raw.githubusercontent.com', '日本 3', '[日本 东京] - 该公益加速源由 [g.blfrp.cn] 提供'],
			['https://github.3x25.com/https://raw.githubusercontent.com', '新加坡', '[新加坡] - 该公益加速源由 [github.3x25.com] 提供'],
			//['https://raw.bgithub.xyz', '荷兰', '[荷兰] - 该公益加速源由 [bgithub.xyz] 提供&#10;&#10; - 缓存：有'],
			//['https://gcore.jsdelivr.net/gh', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [JSDelivr CDN] 提供&#10;&#10; - 缓存：有&#10; - 不支持大小超过 50 MB 的文件&#10; - 不支持版本号格式的分支名（如 v1.2.3）'], // 变成 美国 Cloudflare CDN 了
			//['https://jsdelivr.b-cdn.net/gh', '其他', '[中国香港、中国台湾、日本、新加坡等]（CDN 不固定） - 该公益加速源由 [@rttwyjz] 提供&#10;&#10; - 缓存：有'], // 疑似 SNI 阻断
			//['https://xget.xi-xu.me/gh', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [github.com/xixu-me/Xget] 提供'],
			//['https://ghproxy.1888866.xyz/https://raw.githubusercontent.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [WJQSERVER-STUDIO/ghproxy] 提供'],
			//['https://github.moeyy.xyz/https://raw.githubusercontent.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [moeyy.cn] 提供&#10;&#10; - 缓存：有（约 10 分钟）'],  // 墙了
			//['https://gh-proxy.net/https://raw.githubusercontent.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh-proxy.net] 提供'],
			//['https://rapidgit.jjda.de5.net/https://github.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [热心网友] 提供'],
			//['https://github.yongyong.online/https://raw.githubusercontent.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [github.yongyong.online] 提供'],
			//['https://ghdd.862510.xyz/https://raw.githubusercontent.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [ghdd.862510.xyz] 提供'],
			//['https://raw.cachefly.998111.xyz', '其他 4', '[新加坡、日本、印度等]（Anycast CDN 不固定） - 该公益加速源由 [@XxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxX0] 提供&#10;&#10; - 缓存：有（约 12 小时）'], // 证书到期
			//['https://ghproxy.it/https://raw.githubusercontent.com', '美国', '[美国 洛杉矶] - 该公益加速源由 [@yionchilau] 提供&#10;&#10; - 缓存：无（或很短）'],
			//['https://raw.github.site', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [@yionchilau] 提供&#10;&#10; - 缓存：无（或很短）'], // 挂了
			//['https://raw.github.store', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [@yionchilau] 提供&#10;&#10; - 缓存：无（或很短）'], // 挂了
			//['https://gh.jiasu.in/https://raw.githubusercontent.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [@0-RTT] 提供'], // 404
			//['https://github.boki.moe/https://raw.githubusercontent.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [blog.boki.moe] 提供&#10;&#10; - 缓存：无（或很短）'],
			//['https://gh-proxy.org/https://raw.githubusercontent.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [gh-proxy.com] 提供&#10;&#10; - 缓存：有'],
			//['https://cdn.gh-proxy.org/https://raw.githubusercontent.com', '其他', '[Fastly CDN] - 该公益加速源由 [gh-proxy.com] 提供'],
			//['https://edgeone.gh-proxy.org/https://raw.githubusercontent.com', '其他', '[edgeone] - 该公益加速源由 [gh-proxy.com] 提供'],
			//['https://cdn.githubraw.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [githubraw.com] 提供&#10;&#10; - 缓存：有（几乎永久）'],
			//['https://raw.dgithub.xyz', '美国', '[美国 西雅图] - 该公益加速源由 [dgithub.xyz] 提供&#10;&#10; - 缓存：无（或很短）'],
			//['https://gh-proxy.ygxz.in//https://raw.githubusercontent.com', '美国', '[美国 洛杉矶] - 该公益加速源由 [@一个小站 www.ygxz.in] 提供&#10;&#10; - 缓存：无（或很短）'], // 被蔷
			//['https://raw.nuaa.cf', '美国', '[美国 洛杉矶] - 该公益加速源由 [FastGit 群组成员] 提供'], // 证书到期
			//['https://raw.yzuu.cf', '美国', '[美国 纽约] - 该公益加速源由 [FastGit 群组成员] 提供'], // 证书到期
			//['https://hub.gitmirror.com/raw.githubusercontent.com', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [GitMirror] 提供&#10;&#10; - 缓存：无（或很短）'],
			//['https://jsdelivr-cdn.pencilnavrp.990989.xyz/gh', '美国', '[美国 Cloudflare CDN] - 该公益加速源由 [PencilNavigator] 提供&#10;&#10; - 缓存：有'],
			//['https://git.yumenaka.net/https://raw.githubusercontent.com', '美国', '[美国 圣何塞]'], // 连接超时
		], svg = [
			'<svg class="octicon octicon-cloud-download" aria-hidden="true" height="16" version="1.1" viewBox="0 0 16 16" width="16"><path d="M9 12h2l-3 3-3-3h2V7h2v5zm3-8c0-.44-.91-3-4.5-3C5.08 1 3 2.92 3 5 1.02 5 0 6.52 0 8c0 1.53 1 3 3 3h3V9.7H3C1.38 9.7 1.3 8.28 1.3 8c0-.17.05-1.7 1.7-1.7h1.3V5c0-1.39 1.56-2.7 3.2-2.7 2.55 0 3.13 1.55 3.2 1.8v1.2H12c.81 0 2.7.22 2.7 2.2 0 2.09-2.25 2.2-2.7 2.2h-2V11h2c2.08 0 4-1.16 4-3.5C16 5.06 14.08 4 12 4z"></path></svg>'
		], style = ['padding:0 6px; margin-right: -1px; border-radius: 2px; background-color: var(--XIU2-background-color); border-color: var(--borderColor-default); font-size: 11px; color: var(--XIU2-font-color);'];

		if (menu_rawFast == null){menu_rawFast = 1; GM_setValue('xiu2_menu_raw_fast', 1)};
		if (GM_getValue('menu_rawDownLink') == null){GM_setValue('menu_rawDownLink', true)};
		if (GM_getValue('menu_gitClone') == null){GM_setValue('menu_gitClone', true)};
		// 如果自定义加速源不存在或为空则忽略，如果自定义加速源地址存在，则添加到 raw_url、clone_url 数组中
		if (GM_getValue('custom_raw_url')) {raw_url.splice(1, 0, [GM_getValue('custom_raw_url'), '自定义', '[由你自定义的 Raw 加速源]&#10;&#10;提示：点击浏览器右上角 Tampermonkey 扩展图标 - [ #️⃣ 自定义加速源 ]&#10;即可轮流设置 Raw、Git Clone、Release/Code(ZIP) 的自定义加速源地址（留空代表不设置）。'])};
		if (GM_getValue('custom_clone_url')) {clone_url.unshift([GM_getValue('custom_clone_url'), '自定义', '[由你自定义的 Git Clone 加速源]&#10;&#10;提示：点击浏览器右上角 Tampermonkey 扩展图标 - [ #️⃣ 自定义加速源 ]&#10;即可轮流设置 Raw、Git Clone、Release/Code(ZIP) 的自定义加速源地址（留空代表不设置）。'])};
		registerMenuCommand();
		// 注册脚本菜单
		function registerMenuCommand() {
			// 如果反馈菜单ID不是 null，则删除所有脚本菜单
			if (menu_feedBack_ID) {GM_unregisterMenuCommand(menu_rawFast_ID); GM_unregisterMenuCommand(menu_rawDownLink_ID); GM_unregisterMenuCommand(menu_gitClone_ID); GM_unregisterMenuCommand(menu_customUrl_ID); GM_unregisterMenuCommand(menu_feedBack_ID); GM_unregisterMenuCommand(menu_hideShortcut_ID); GM_unregisterMenuCommand(menu_showShortcut_ID); menu_rawFast = GM_getValue('xiu2_menu_raw_fast');}
			// 避免在减少 raw 数组后，用户储存的数据大于数组而报错
			if (menu_rawFast > raw_url.length - 1) menu_rawFast = 0
			menu_rawDownLink_ID = GM_registerMenuCommand(`${GM_getValue('menu_rawDownLink')?'✅':'❌'} 项目列表单文件快捷下载 (☁)`, function(){if (GM_getValue('menu_rawDownLink') == true) {GM_setValue('menu_rawDownLink', false); GM_notification({text: `已关闭「项目列表单文件快捷下载 (☁)」功能\n（点击刷新网页后生效）`, timeout: 3500, onclick: function(){location.reload();}});} else {GM_setValue('menu_rawDownLink', true); GM_notification({text: `已开启「项目列表单文件快捷下载 (☁)」功能\n（点击刷新网页后生效）`, timeout: 3500, onclick: function(){location.reload();}});}registerMenuCommand();}, {title: "点击开关「项目列表单文件快捷下载 (☁)」功能"});
			if (GM_getValue('menu_rawDownLink')) menu_rawFast_ID = GM_registerMenuCommand(`&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'][menu_rawFast]} [ ${raw_url[menu_rawFast][1]} ] 加速源 (☁) - 点击切换`, menu_toggle_raw_fast, {title: "点击切换「项目列表单文件快捷下载 (☁)」功能的加速源"});
			menu_gitClone_ID = GM_registerMenuCommand(`${GM_getValue('menu_gitClone')?'✅':'❌'} 添加 git clone 命令`, function(){if (GM_getValue('menu_gitClone') == true) {GM_setValue('menu_gitClone', false); GM_notification({text: `已关闭「添加 git clone 命令」功能`, timeout: 3500});} else {GM_setValue('menu_gitClone', true); GM_notification({text: `已开启「添加 git clone 命令」功能`, timeout: 3500});}registerMenuCommand();}, {title: "点击开关「添加 git clone 命令」功能"});
			menu_customUrl_ID = GM_registerMenuCommand(`#️⃣ 自定义加速源`, function () {
				// 定义三种自定义加速源的键名和描述
				const customKeys = [
					{ key: 'custom_raw_url', desc: 'Raw 加速源', placeholder: 'https://example.com/https://raw.githubusercontent.com' },
					{ key: 'custom_clone_url', desc: 'Git Clone 加速源', placeholder: 'https://example.com/https://github.com' },
					{ key: 'custom_download_url', desc: 'Release/Code(ZIP) 加速源', placeholder: 'https://example.com/https://github.com' }
				];
				// 递归弹出输入框
				function promptCustomUrl(index = 0) {
					if (index >= customKeys.length) {GM_notification({ text: '自定义加速源设置已完成！\n（点击刷新网页后生效）', timeout: 3500, onclick: function () { location.reload(); } });return;}
					const { key, desc, placeholder } = customKeys[index];
					let current = GM_getValue(key, '');
					let input = prompt(`请输入自定义${desc}地址：\n- 当前：\n${current || '(未设置)'}\n\n- 示例：\n${placeholder}\n\n- 留空为不设置\n- 点击 [确定] 保存 并 继续设置下一个\n- 点击 [取消] 不保存 并 终止后续设置`,current);
					if (input !== null) {GM_setValue(key, input.trim());promptCustomUrl(index + 1);}// 如果用户点击 取消 按钮，则不再继续弹出
				}
				promptCustomUrl();
			});
			menu_feedBack_ID = GM_registerMenuCommand('💬 反馈问题 & 功能建议', function () {GM_openInTab('https://github.com/XIU2/UserScript', {active: true,insert: true,setParent: true});GM_openInTab('https://greasyfork.org/zh-CN/scripts/412245/feedback', {active: true,insert: true,setParent: true});}, {title: "点击前往反馈问题或提出建议"});
			menu_hideShortcut_ID = GM_registerMenuCommand('🐍 隐藏图标（快捷键：Ctrl+Alt+H）', function () {DS_hidePlugin()}, {title: "点击隐藏图标"});
			menu_showShortcut_ID = GM_registerMenuCommand('🐢 显示图标（快捷键：Ctrl+Alt+S）', null, {title: "隐藏后可通过快捷键呼出图标"});
		}

		// 切换加速源
		function menu_toggle_raw_fast() {
			// 如果当前加速源位置大于等于加速源总数，则改为第一个加速源，反之递增下一个加速源
			if (menu_rawFast >= raw_url.length - 1) {menu_rawFast = 0;} else {menu_rawFast += 1;}
			GM_setValue('xiu2_menu_raw_fast', menu_rawFast);
			delRawDownLink(); // 删除旧加速源
			addRawDownLink(); // 添加新加速源
			GM_notification({text: "已切换加速源为：" + raw_url[menu_rawFast][1], timeout: 3000}); // 提示消息
			registerMenuCommand(); // 重新注册脚本菜单
		};

		colorMode(); // 适配白天/夜间主题模式
		setTimeout(addRawFile, 1000); // Raw 加速
		setTimeout(addRawDownLink, 2000); // Raw 单文件快捷下载（☁），延迟 2 秒执行，避免被 pjax 刷掉

		// Tampermonkey v4.11 版本添加的 onurlchange 事件 grant，可以监控 pjax 等网页的 URL 变化
		if (window.onurlchange === undefined) addUrlChangeEvent();
		window.addEventListener('urlchange', function() {
			colorMode(); // 适配白天/夜间主题模式
			if (location.pathname.indexOf('/releases')) addRelease(); // Release 加速
			setTimeout(addRawFile, 1000); // Raw 加速
			setTimeout(addRawDownLink, 2000); // Raw 单文件快捷下载（☁），延迟 2 秒执行，避免被 pjax 刷掉
			setTimeout(addRawDownLink_, 1000); // 在浏览器返回/前进时重新添加 Raw 下载链接（☁）鼠标事件
		});


		// Github Git Clone/SSH、Release、Download ZIP 改版为动态加载文件列表，因此需要监控网页元素变化
		const callback = (mutationsList, observer) => {
			if (location.pathname.indexOf('/releases') > -1) { // Release
				for (const mutation of mutationsList) {
					for (const target of mutation.addedNodes) {
						if (target.nodeType !== 1) return
						if (target.tagName === 'DIV' && target.dataset.viewComponent === 'true' && target.classList[0] === 'Box') addRelease();
					}
				}
			} else if (document.querySelector('#repository-container-header:not([hidden])')) { // 项目首页
				for (const mutation of mutationsList) {
					for (const target of mutation.addedNodes) {
						if (target.nodeType !== 1) return
						if (target.tagName === 'DIV' && target.parentElement && target.parentElement.id === '__primerPortalRoot__') {
							addDownloadZIP(target);
							addGitClone(target);
							addGitCloneSSH(target);
						} else if (target.tagName === 'DIV' && target.className.indexOf('Box-sc-') != -1) {
							if (target.querySelector('input[value^="https:"]')) {
								addGitCloneClear('.XIU2-GCS'); addGitClone(target);
							} else if (target.querySelector('input[value^="git@"]')) {
								addGitCloneClear('.XIU2-GC'); addGitCloneSSH(target);
							} else if (target.querySelector('input[value^="gh "]')) {
								addGitCloneClear('.XIU2-GC, .XIU2-GCS');
							}
						}
					}
				}
			}
		};
		const observer = new MutationObserver(callback);
		observer.observe(document, { childList: true, subtree: true });


		// download_url 随机 4 个美国加速源
		function get_New_download_url() {
			//return download_url_us // 全输出调试用
			let minnum = 6; // 随机输出几个美国加速源
			if (GM_getValue('custom_download_url')) {minnum = 5;} // 如果有自定义加速源，则只随机输出 5 个美国加速源
			let shuffled = download_url_us.slice(0), i = download_url_us.length, min = i - minnum, temp, index;
			while (i-- > min) {index = Math.floor((i + 1) * Math.random()); temp = shuffled[index]; shuffled[index] = shuffled[i]; shuffled[i] = temp;}
			// 如果有自定义加速源，则将其添加到随机数组的开头
			if (GM_getValue('custom_download_url')) {return [[GM_getValue('custom_download_url'), '自定义', '[由你自定义的 Release/Code(ZIP) 加速源地址]&#10;&#10;提示：点击浏览器右上角 Tampermonkey 扩展图标 - [ #️⃣ 自定义加速源 ]&#10;即可轮流设置 Raw、Git Clone、Release/Code(ZIP) 的自定义加速源地址（留空代表不设置）。']].concat(shuffled.slice(min)).concat(download_url);}
			return shuffled.slice(min).concat(download_url); // 随机洗牌 download_url_us 数组并取前几个，然后将其合并至 download_url 数组
			// 为了缓解非美国公益节点压力（考虑到很多人无视前面随机的美国节点），干脆也将其加入随机
		}

		// Release
		function addRelease() {
			let html = document.querySelectorAll('.Box-footer'); if (html.length == 0 || location.pathname.indexOf('/releases') == -1) return

			// li:hover 鼠标悬停变色
			let styleHover = document.getElementById('XIU2-hover-style');
			if (!styleHover) {
				styleHover = document.createElement('style');
				styleHover.id = 'XIU2-hover-style';
				styleHover.innerHTML = '\n\t.Box-footer ul { padding-top: 1px; }\n\t.Box-footer ul li.Box-row:hover { background-color: var(--bgColor-muted); }\n';
				document.head.appendChild(styleHover);
			}

			let divDisplay = 'margin-left: -90px;', new_download_url = get_New_download_url();
			if (document.documentElement.clientWidth > 755) {divDisplay = 'margin-top: -3px;margin-left: 8px;display: inherit;';}; // 调整小屏幕时的样式
			html[0].appendChild(document.createElement('style')).textContent = '@media (min-width: 768px) {.Box-footer li.Box-row>div>span.color-fg-muted {min-width: 27px !important;}}';
			for (const current of html) {
				if (current.querySelector('.XIU2-RS')) continue
				current.querySelectorAll('li.Box-row a').forEach(function (_this) {
					let href = _this.href.split(location.host),
						url = '', _html = `<div class="XIU2-RS" style="${divDisplay}">`;

					for (let i=0;i<new_download_url.length;i++) {
						if (new_download_url[i][3] !== undefined && url.indexOf('/archive/') !== -1) {
							url = new_download_url[i][3] + href[1]
						} else {
							url = new_download_url[i][0] + href[1]
						}
						_html += `<a style="${style[0]}" class="btn" href="${url}" target="_blank" title="${new_download_url[i][2]}\n\n提示：如果不想要点击链接在前台打开空白新标签页（一闪而过影响体验），\n可以 [鼠标中键] 或 [Ctrl+鼠标左键] 点击加速链接即可在后台打开新标签页！" rel="noreferrer noopener nofollow">${new_download_url[i][1]}</a>`
					}
					_this.parentElement.nextElementSibling.insertAdjacentHTML('beforeend', _html + '</div>');
				});
			}
		}


		// Download ZIP
		function addDownloadZIP(target) {
			let html = target.querySelector('ul[class^=prc-ActionList-ActionList-]>li:last-child');if (!html) return
			let href_script = document.querySelector('react-partial[partial-name=repos-overview]>script[data-target="react-partial.embeddedData"]'),
				href_slice = href_script.textContent.slice(href_script.textContent.indexOf('"zipballUrl":"')+14),
				href = href_slice.slice(0, href_slice.indexOf('"')),
				url = '', _html = '', new_download_url = get_New_download_url();

			// 克隆原 Download ZIP 元素，并定位 <a> <span> 标签
			let html_clone = html.cloneNode(true),
				html_clone_a = html_clone.querySelector('a[href$=".zip"]'),
				html_clone_span = html_clone.querySelector('span[id]');

			for (let i=0;i<new_download_url.length;i++) {
				if (new_download_url[i][3] === '') continue

				if (new_download_url[i][3] !== undefined) {
					url = new_download_url[i][3] + href
				} else {
					url = new_download_url[i][0] + href
				}
				html_clone_a.href = url
				html_clone_a.setAttribute('title', new_download_url[i][2].replaceAll('&#10;','\n') + '\n\n提示：如果不想要点击链接在前台打开空白新标签页（一闪而过影响体验），\n可以 [鼠标中键] 或 [Ctrl+鼠标左键] 点击加速链接即可在后台打开新标签页！');
				html_clone_a.setAttribute('target', '_blank');
				html_clone_a.setAttribute('rel', 'noreferrer noopener nofollow');
				html_clone_span.textContent = 'Download ZIP ' + new_download_url[i][1]
				_html += html_clone.outerHTML
			}
			html.insertAdjacentHTML('afterend', _html);
		}

		// Git Clone 切换清理
		function addGitCloneClear(css) {
			document.querySelectorAll(css).forEach((e)=>{e.remove()})
		}

		// Git Clone
		function addGitClone(target) {
			let html = target.querySelector('input[value^="https:"]:not([title])');if (!html) return
			let href_split = html.value.split(location.host)[1],
				html_parent = '<div style="margin-top: 4px;" class="XIU2-GC ' + html.parentElement.className + '">',
				url = '', _html = '', _gitClone = '';
			if (html.nextElementSibling) html.nextElementSibling.hidden = true; // 隐藏右侧复制按钮（考虑到能直接点击复制，就不再重复实现复制按钮事件了）
			if (html.parentElement.nextElementSibling.tagName === 'SPAN'){
				html.parentElement.nextElementSibling.textContent += ' (↑点击上面文字可复制)'
			}
			if (GM_getValue('menu_gitClone')) {_gitClone='git clone '; html.value = _gitClone + html.value; html.setAttribute('value', html.value);}
			// 克隆原 Git Clone 元素
			let html_clone = html.cloneNode(true);
			for (let i=0;i<clone_url.length;i++) {
				if (clone_url[i][0] === 'https://gitclone.com') {
					url = clone_url[i][0] + '/github.com' + href_split
				} else {
					url = clone_url[i][0] + href_split
				}
				html_clone.title = `${url}\n\n${clone_url[i][2].replaceAll('&#10;','\n')}\n\n提示：点击文字可直接复制`
				html_clone.setAttribute('value', _gitClone + url)
				_html += html_parent + html_clone.outerHTML + '</div>'
			}
			html.parentElement.insertAdjacentHTML('afterend', _html);
			if (html.parentElement.parentElement.className.indexOf('XIU2-GCP') === -1){
				html.parentElement.parentElement.classList.add('XIU2-GCP')
				html.parentElement.parentElement.addEventListener('click', (e)=>{if (e.target.tagName === 'INPUT') {GM_setClipboard(e.target.value, {notificationTitle:GM_getValue('menu_gitClone')?'git clone命令已复制：':'git地址已复制：',notification:e.target.value});}})
			}
		}


		// Git Clone SSH
		function addGitCloneSSH(target) {
			let html = target.querySelector('input[value^="git@"]:not([title])');if (!html) return
			let href_split = html.value.split(':')[1],
				html_parent = '<div style="margin-top: 4px;" class="XIU2-GCS ' + html.parentElement.className + '">',
				url = '', _html = '', _gitClone = '';
			html.nextElementSibling.hidden = true; // 隐藏右侧复制按钮（考虑到能直接点击复制，就不再重复实现复制按钮事件了）
			if (html.parentElement.nextElementSibling.tagName === 'SPAN'){
				html.parentElement.nextElementSibling.textContent += ' (↑点击文字可复制)'
			}
			if (GM_getValue('menu_gitClone')) {_gitClone='git clone '; html.value = _gitClone + html.value; html.setAttribute('value', html.value);}
			// 克隆原 Git Clone SSH 元素
			let html_clone = html.cloneNode(true);
			for (let i=0;i<clone_ssh_url.length;i++) {
				url = clone_ssh_url[i][0] + href_split
				html_clone.title = `${url}\n\n${clone_ssh_url[i][2].replaceAll('&#10;','\n')}\n\n提示：点击文字可直接复制`
				html_clone.setAttribute('value', _gitClone + url)
				_html += html_parent + html_clone.outerHTML + '</div>'
			}
			html.parentElement.insertAdjacentHTML('afterend', _html);
			if (html.parentElement.parentElement.className.indexOf('XIU2-GCP') === -1){
				html.parentElement.parentElement.classList.add('XIU2-GCP')
				html.parentElement.parentElement.addEventListener('click', (e)=>{if (e.target.tagName === 'INPUT') {GM_setClipboard(e.target.value, {notificationTitle:GM_getValue('menu_gitClone')?'git clone命令已复制：':'git地址已复制：',notification:e.target.value});}})
			}
		}


		// Raw
		function addRawFile() {
			let html = document.querySelector('a[data-testid="raw-button"]');if (!html) return
			let href = location.href.replace(`https://${location.host}`,''),
				href2 = href.replace('/blob/','/'),
				url = '', _html = '';

			for (let i=1;i<raw_url.length;i++) {
				if ((raw_url[i][0].indexOf('/gh') + 3 === raw_url[i][0].length) && raw_url[i][0].indexOf('cdn.staticaly.com') === -1) {
					url = raw_url[i][0] + href.replace('/blob/','@');
				} else {
					url = raw_url[i][0] + href2;
				}
				_html += `<a href="${url}" title="${raw_url[i][2]}\n\n提示：如果想要直接下载，可使用 [Alt + 左键] 点击加速按钮或 [右键 - 另存为...]" target="_blank" role="button" rel="noreferrer noopener nofollow" data-size="small" data-variant="default" class="${html.className} XIU2-RF" style="border-radius: 0;margin-left: -1px;">${raw_url[i][1].replace(/ \d/,'')}</a>`
			}
			if (document.querySelector('.XIU2-RF')) document.querySelectorAll('.XIU2-RF').forEach((e)=>{e.remove()})
			html.insertAdjacentHTML('afterend', _html);
		}


		// Raw 单文件快捷下载（☁）
		function addRawDownLink() {
			if (!GM_getValue('menu_rawDownLink')) return
			// 如果不是项目文件页面，就返回，如果网页有 Raw 下载链接（☁）就返回
			let files = document.querySelectorAll('div.Box-row svg.octicon.octicon-file, .react-directory-filename-column>svg.color-fg-muted');if(files.length === 0) return;if (location.pathname.indexOf('/tags') > -1) return
			let files1 = document.querySelectorAll('a.fileDownLink');if(files1.length > 0) return;

			// 鼠标指向则显示
			var mouseOverHandler = function(evt) {
				let elem = evt.currentTarget,
					aElm_new = elem.querySelectorAll('.fileDownLink'),
					aElm_now = elem.querySelectorAll('svg.octicon.octicon-file, svg.color-fg-muted');
				aElm_new.forEach(el=>{el.style.cssText = 'display: inline'});
				aElm_now.forEach(el=>{el.style.cssText = 'display: none'});
			};

			// 鼠标离开则隐藏
			var mouseOutHandler = function(evt) {
				let elem = evt.currentTarget,
					aElm_new = elem.querySelectorAll('.fileDownLink'),
					aElm_now = elem.querySelectorAll('svg.octicon.octicon-file, svg.color-fg-muted');
				aElm_new.forEach(el=>{el.style.cssText = 'display: none'});
				aElm_now.forEach(el=>{el.style.cssText = 'display: inline'});
			};

			// 循环添加
			files.forEach(function(fileElm) {
				let trElm = fileElm.parentNode.parentNode,
					cntElm_a = trElm.querySelector('[role="rowheader"] > .css-truncate.css-truncate-target.d-block.width-fit > a, .react-directory-truncate>a'),
					Name = cntElm_a.innerText,
					href = cntElm_a.getAttribute('href'),
					href2 = href.replace('/blob/','/'), url = '';
				if ((raw_url[menu_rawFast][0].indexOf('/gh') + 3 === raw_url[menu_rawFast][0].length) && raw_url[menu_rawFast][0].indexOf('cdn.staticaly.com') === -1) {
					url = raw_url[menu_rawFast][0] + href.replace('/blob/','@');
				} else {
					url = raw_url[menu_rawFast][0] + href2;
				}

				fileElm.insertAdjacentHTML('afterend', `<a href="${url}?DS_DOWNLOAD" download="${Name}" target="_blank" rel="noreferrer noopener nofollow" class="fileDownLink" style="display: none;" title="「${raw_url[menu_rawFast][1]}」&#10;&#10;左键点击下载文件（注意：鼠标点击 [☁] 图标进行下载，而不是文件名！）&#10;&#10;${raw_url[menu_rawFast][2]}&#10;&#10;提示：点击页面右侧飘浮着的 TamperMonkey 扩展图标中的菜单「 [${raw_url[menu_rawFast][1]}] 加速源 (☁) 」即可切换。">${svg[0]}</a>`);
				// 绑定鼠标事件
				trElm.onmouseover = mouseOverHandler;
				trElm.onmouseout = mouseOutHandler;
			});
		}


		// 移除 Raw 单文件快捷下载（☁）
		function delRawDownLink() {
			if (!GM_getValue('menu_rawDownLink')) return
			let aElm = document.querySelectorAll('.fileDownLink');if(aElm.length === 0) return;
			aElm.forEach(function(fileElm) {fileElm.remove();})
		}


		// 在浏览器返回/前进时重新添加 Raw 单文件快捷下载（☁）鼠标事件
		function addRawDownLink_() {
			if (!GM_getValue('menu_rawDownLink')) return
			// 如果不是项目文件页面，就返回，如果网页没有 Raw 下载链接（☁）就返回
			let files = document.querySelectorAll('div.Box-row svg.octicon.octicon-file, .react-directory-filename-column>svg.color-fg-muted');if(files.length === 0) return;
			let files1 = document.querySelectorAll('a.fileDownLink');if(files1.length === 0) return;

			// 鼠标指向则显示
			var mouseOverHandler = function(evt) {
				let elem = evt.currentTarget,
					aElm_new = elem.querySelectorAll('.fileDownLink'),
					aElm_now = elem.querySelectorAll('svg.octicon.octicon-file, svg.color-fg-muted');
				aElm_new.forEach(el=>{el.style.cssText = 'display: inline'});
				aElm_now.forEach(el=>{el.style.cssText = 'display: none'});
			};

			// 鼠标离开则隐藏
			var mouseOutHandler = function(evt) {
				let elem = evt.currentTarget,
					aElm_new = elem.querySelectorAll('.fileDownLink'),
					aElm_now = elem.querySelectorAll('svg.octicon.octicon-file, svg.color-fg-muted');
				aElm_new.forEach(el=>{el.style.cssText = 'display: none'});
				aElm_now.forEach(el=>{el.style.cssText = 'display: inline'});
			};
			// 循环添加
			files.forEach(function(fileElm) {
				let trElm = fileElm.parentNode.parentNode;
				// 绑定鼠标事件
				trElm.onmouseover = mouseOverHandler;
				trElm.onmouseout = mouseOutHandler;
			});
		}


		// 适配白天/夜间主题模式
		function colorMode() {
			let style_Add;
			if (document.getElementById('XIU2-Github')) {style_Add = document.getElementById('XIU2-Github')} else {style_Add = document.createElement('style'); style_Add.id = 'XIU2-Github'; style_Add.type = 'text/css';}
			let backColor = '#ffffff', fontColor = '#888888';

			if (document.lastElementChild.dataset.colorMode === 'dark') { // 如果是夜间模式
				if (document.lastElementChild.dataset.darkTheme === 'dark_dimmed') {
					backColor = '#272e37'; fontColor = '#768390';
				} else {
					backColor = '#161a21'; fontColor = '#97a0aa';
				}
			} else if (document.lastElementChild.dataset.colorMode === 'auto') { // 如果是自动模式
				if (window.matchMedia('(prefers-color-scheme: dark)').matches || document.lastElementChild.dataset.lightTheme.indexOf('dark') > -1) { // 如果浏览器是夜间模式 或 白天模式是 dark 的情况
					if (document.lastElementChild.dataset.darkTheme === 'dark_dimmed') {
						backColor = '#272e37'; fontColor = '#768390';
					} else if (document.lastElementChild.dataset.darkTheme.indexOf('light') == -1) { // 排除夜间模式是 light 的情况
						backColor = '#161a21'; fontColor = '#97a0aa';
					}
				}
			}

			document.lastElementChild.appendChild(style_Add).textContent = `.XIU2-RS a {--XIU2-background-color: ${backColor}; --XIU2-font-color: ${fontColor};}`;
		}


		// 自定义 urlchange 事件（用来监听 URL 变化），针对非 Tampermonkey 油猴管理器
		function addUrlChangeEvent() {
			history.pushState = ( f => function pushState(){
				var ret = f.apply(this, arguments);
				window.dispatchEvent(new Event('pushstate'));
				window.dispatchEvent(new Event('urlchange'));
				return ret;
			})(history.pushState);

			history.replaceState = ( f => function replaceState(){
				var ret = f.apply(this, arguments);
				window.dispatchEvent(new Event('replacestate'));
				window.dispatchEvent(new Event('urlchange'));
				return ret;
			})(history.replaceState);

			window.addEventListener('popstate',()=>{ // 点击浏览器的前进/后退按钮时触发 urlchange 事件
				window.dispatchEvent(new Event('urlchange'))
			});
		}
	})();
	console.log(`ds_github_monkey_${ds_github_monkey_version}: completed`)
})
console.log(`ds_github_monkey_${ds_github_monkey_version}: loaded`)