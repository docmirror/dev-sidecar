/**
 * 篡改猴（Tampermonkey）| 油猴（Greasemonkey）浏览器脚本扩展
 *
 * @version        0.1.4
 * @since          2024-04-24 17:06
 * @author         王良
 * @authorHomePage https://wangliang1024.cn
 * @remark         当前脚本为仿照的版本，并非篡改猴插件的源码，仅供学习参考。
 * @description    篡改猴 (Tampermonkey) 是拥有 超过 1000 万用户 的最流行的浏览器扩展之一。 它适用于 Chrome、Microsoft Edge、Safari、Opera Next 和 Firefox。
 *                 有些人也会把篡改猴(Tampermonkey)称作油猴(Greasemonkey)，尽管后者只是一款仅适用于 Firefox 浏览器的浏览器扩展程序。
 *                 它允许用户自定义并增强您最喜爱的网页的功能。用户脚本是小型 JavaScript 程序，可用于向网页添加新功能或修改现有功能。使用 篡改猴，您可以轻松在任何网站上创建、管理和运行这些用户脚本。
 *                 例如，使用 篡改猴，您可以向网页添加一个新按钮，可以快速在社交媒体上分享链接，或自动填写带有个人信息的表格。在数字化时代，这特别有用，因为网页常常被用作访问广泛的服务和应用程序的用户界面。
 *                 此外，篡改猴 使您轻松找到并安装其他用户创建的用户脚本。这意味着您可以快速轻松地访问为您喜爱的网页定制的广泛库，而无需花费数小时编写自己的代码。
 *                 无论您是希望为您的站点添加新功能的 Web 开发人员，还是只是希望 改善在线体验的普通用户，篡改猴 都是您的工具箱中的一个很好的工具。
 * @homepageUrl    https://www.tampermonkey.net
 */
'use strict';
(function () {
	const version = "0.1.4";
	const PRE = "DS-Tampermonkey:"; // 前缀
	const MENU_ID_PRE = PRE + "menu-";
	const icon = "data:image/png;base64,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";

	const context = {
		initialized: false, // 是否已经初始化
		defaultPluginOptions: {}, // 默认插件选项
		pluginOptions: {}, // 插件选项
		styleElement: null, // 插件样式元素
		pluginElement: null, // 插件元素
		arrowElement: null, // 箭头元素
		menusElement: null, // 菜单列表元素
		userMenusElement: null, // 用户菜单列表元素
		menus: {}, // 菜单集合
		menuIndex: 0, // 菜单索引，用于生成menuCmdId
		lastNotification: null // 最后一次通知
		/* 最后一次通知的对象结构如下：
		{
			obj: null, // 通知对象，类型：Notification
			options: null, // 通知选项
			timeout: null // 通知定时器
		}
		*/
	};


	// 创建插件API
	const api = {};

	// 监听页面关闭事件，用于关闭最后一个通知
	window.addEventListener('beforeunload', function(event) {
		api.closeLastNotification();
	});


	//region DS自定义的API start

	// 获取上下文
	api.getContext = () => context;

	// 创建插件样式
	api.createPluginStyle = (options) => {
		options = options || {};

		// 创建一个新的<style>元素
		const styleElement = document.createElement('style');
		styleElement.id = PRE + "plugin-style";
		// 设置<style>元素的type属性
		styleElement.type = 'text/css';

		// 设置<style>元素的内容
		let cssContent = `
.___ds-tampermonkey___{
	position: fixed;
	right: 10px;
	top: 30%;
	z-index: 9999;
	width: 36px;
	height: 36px;
	border-radius: 8px;
	user-select: none;         /* Standard syntax */  
	-webkit-user-select: none; /* Safari */  
	-ms-user-select: none;     /* IE 10+/Edge */  
	background-color: #DDD;
	background-repeat: no-repeat;
	background-size: cover;
	background-image: url("${icon}");
}
.___ds-tampermonkey-hide___{
	width: 0;
}
.___ds-menus___{
	display: none;
	position: absolute;
	right: 36px;
	top: 0;
	z-index: 10000;
	min-width: 200px;
	min-height: 35px;
	border-radius: 8px;
	background-color: #323231;
	border: 1px solid #52525E;
	overflow: hidden;
}
.___ds-tampermonkey___:hover:not(.___ds-tampermonkey-hide___) .___ds-menus___{
	display: block;
}
.___ds-tampermonkey-hide___ .___ds-menus___{
	display: none;
}
.___ds-menu___{
	height: 35px;
	line-height: 35px;
	padding: 0 10px;
	white-space: nowrap;
	color: #FFF;
	cursor: pointer;
	margin-left: 26px;
}
.___ds-menu___:hover{
	background-color: #855F16;
}
.___ds-menu0___{
	margin-left: 0;
	font-size: 16px;
	font-weight: bold;
}
.___ds-menu0___ img{
	width: 23px;
	height: 23px;
	vertical-align: middle;
	margin: 0 8px 3px 8px;
}
.___ds-arrow___{
	width: 0;
	height: 0;
	position: absolute;
	top: 11px;
	left: 36px;
	cursor: pointer;
	border-top: 7px solid transparent;
	border-bottom: 7px solid transparent;
	border-left: 10px solid #665c5c;
	display: none;
}
.___ds-tampermonkey___:hover .___ds-arrow___{
	display: block;
}
.___ds-tampermonkey-hide___ .___ds-arrow___{
	border-top: 7px solid transparent;
	border-bottom: 7px solid transparent;
	border-right: 10px solid #665c5c;
	border-left: 0;
	left: 0;
	display: block;
}
`;
		// 如果有自定义样式，则添加到 CSS 内容中
		if (options.style) {
			cssContent += options.style;
		}

		// 添加 CSS 内容到<style>元素中
		if (styleElement.styleSheet) {
			// 兼容 IE
			styleElement.styleSheet.cssText = cssContent;
		} else {
			styleElement.appendChild(document.createTextNode(cssContent));
		}

		// 将<style>元素添加到<head>中
		document.head.append(styleElement);

		// 将<style>元素保存在上下文中
		context.styleElement = styleElement;
	};

	// 创建插件div
	api.createPluginDiv = (options) => {
		options = {
			...{ name: "未知名的脚本" },
			...options
		}

		// 创建插件div
		context.pluginElement = document.createElement('div');
		context.pluginElement.id = PRE + "plugin";
		context.pluginElement.title = "油猴插件" + (options.name ? "：" + options.name : "");
		context.pluginElement.className = "___ds-tampermonkey___";
		if (api.GM_getValue("ds_hide")) {
			context.pluginElement.classList.add("___ds-tampermonkey-hide___");
		}

		// 创建菜单列表div
		context.menusElement = document.createElement('div');
		context.menusElement.id = PRE + "menus";
		context.menusElement.className = "___ds-menus___";
		if (options.width > 0) {
			context.menusElement.style['min-width'] = options.width + "px";
		}
		// 将菜单列表div添加到插件div中
		context.pluginElement.append(context.menusElement);

		// 创建开关菜单
		const enabled = api.GM_getValue("ds_enabled", true)
		const switchMenuElement = document.createElement('div');
		const icon = (options.icon ? `<img alt="icon" src="${options.icon}"/>` : " ");
		switchMenuElement.id = PRE + "menu-0";
		switchMenuElement.className = "___ds-menu___ ___ds-menu0___";
		switchMenuElement.innerHTML = (enabled ? "✅" : "❌") + icon + options.name;
		switchMenuElement.title = `点击${enabled ? "关闭" : "开启"}此脚本功能`;
		switchMenuElement.onclick = function () {
			let enabled = api.GM_getValue("ds_enabled", true)
			if (enabled) {
				api.hideUserMenus();
				enabled = false;
			} else {
				api.showUserMenus();
				enabled = true;
			}
			switchMenuElement.innerHTML = (enabled ? "✅" : "❌") + icon + options.name;
			switchMenuElement.title = `点击${enabled ? "关闭" : "开启"}此脚本功能`;
			api.GM_setValue("ds_enabled", enabled)
			api.GM_notification({
				title: "脚本状态变更通知",
				text: `已${enabled ? "开启" : "关闭"} 「${options.name}」 功能\n（点击刷新网页后生效）`,
				timeout: 3500,
				onclick: () => location.reload()
			});
		};
		// 将开关菜单添加到菜单列表div中
		context.menusElement.append(switchMenuElement);

		// 创建用户菜单列表div
		context.userMenusElement = document.createElement('div');
		context.userMenusElement.id = PRE + "user-menus";
		context.userMenusElement.className = "___ds-user-menus___";
		// 将用户菜单div添加到菜单div中
		context.menusElement.append(context.userMenusElement);

		// 获取body元素
		const body = document.getElementsByTagName('body')[0];
		// 将插件div添加到body中
		body.prepend(context.pluginElement);
	}

	// 创建箭头
	api.createArrow = (options) => {
		// 创建箭头元素
		context.arrowElement = document.createElement('div');
		context.arrowElement.id = PRE + "arrow";
		context.arrowElement.className = "___ds-arrow___";
		// 初始化title
		api.initArrowTitle();
		// 绑定点击事件
		context.arrowElement.onclick = () => {
			if (__ds_global__.getContext().pluginElement.classList.contains("___ds-tampermonkey-hide___")) {
				api.showPlugin();
				api.initArrowTitle(false);
			} else {
				api.hidePlugin();
				api.initArrowTitle(true);
			}
		}
		// 将箭头元素添加到插件div中
		context.pluginElement.append(context.arrowElement);
	}

	api.initArrowTitle = (isHidden) => {
		if (isHidden == null) {
			isHidden = context.pluginElement.classList.contains("___ds-tampermonkey-hide___");
		}

		if (isHidden) {
			context.arrowElement.title = "点击展示「油猴插件」的操作界面";
		} else {
			context.arrowElement.title = "点击隐藏「油猴插件」的操作界面";
		}
	}

	// 隐藏插件
	api.hidePlugin = () => {
		if (context.pluginElement) {
			context.pluginElement.classList.add("___ds-tampermonkey-hide___");
		}
		api.GM_setValue("ds_hide", true);
	}

	// 显示插件
	api.showPlugin = () => {
		if (context.pluginElement) {
			context.pluginElement.classList.remove("___ds-tampermonkey-hide___");
		}
		api.GM_setValue("ds_hide", false);
	}

	// 显示用户菜单列表
	api.showUserMenus = () => {
		if (context.userMenusElement) {
			context.userMenusElement.style.display = "block";
		}
	}

	// 隐藏用户菜单列表
	api.hideUserMenus = () => {
		if (context.userMenusElement) {
			context.userMenusElement.style.display = "none";
		}
	}

	// 初始化篡改猴操作界面
	api.DS_init = (options) => {
		try {
			// 如果已经初始化过，则直接返回
			if (context.initialized) return;

			// 合并默认参数
			options = {
				...context.defaultPluginOptions,
				...options
			};

			// 创建样式元素
			api.createPluginStyle(options);
			// 创建插件div
			api.createPluginDiv(options);
			// 创建箭头
			api.createArrow(options);
			// 保存参数
			context.pluginOptions = options;

			// 初始化完成
			context.initialized = true;

			console.log(`ds_tampermonkey_${version}: initialization completed（篡改猴插件初始化完成，篡改猴图标已显示在页面右侧，鼠标移到上面可展示功能列表！）`)
		} catch (e) {
			console.error(`ds_tampermonkey_${version}: initialization failed（篡改猴插件初始化失败）:`, e);
		}
	};

	// 关闭上一个通知
	api.closeLastNotification = () => {
		let lastNotification = context.lastNotification;
		if (lastNotification) {
			context.lastNotification = null;
			lastNotification.timeout && clearTimeout(lastNotification.timeout);
			try {
				lastNotification.obj && lastNotification.obj.close();
			} catch (e) {
				console.error(`ds_tampermonkey_${version}: GM_notification: 关闭上一个通知失败:`, e);
			}
		}
	};

	//endregion DS自定义的API end


	//region 篡改猴标准API，由DS自定义实现 start

	// 注册菜单
	api.GM_registerMenuCommand = (name, callback, options_or_accessKey) => {
		const options = typeof options_or_accessKey === "string" ? { accessKey: options_or_accessKey } : options_or_accessKey;

		// 生成菜单ID
		let menuCmdId;
		if (options.id) {
			if (typeof options.id !== "string") {
				options.id = options.id.toString();
			}

			menuCmdId = (options.id.indexOf(MENU_ID_PRE) === 0 ? '' : MENU_ID_PRE) + options.id;

			// 如果是数字ID，为了避免与自增ID索引冲突，将数字ID赋值给自增ID索引
			if (options.id.match("^\\d+$")) {
				const numberId = parseInt(options.id);
				if (numberId > context.menuIndex) {
					context.menuIndex = numberId;
				}
			}
		} else {
			menuCmdId = MENU_ID_PRE + (++context.menuIndex);
		}

		// 创建菜单元素
		const menuElement = document.createElement('div');
		menuElement.id = menuCmdId;
		menuElement.className = "___ds-menu___";
		menuElement.innerHTML = name;
		if (options.title) {
			menuElement.title = typeof options.title === "function" ? options.title() : options.title;
		}
		if (callback) {
			menuElement.onclick = callback;
		}
		if (options.accessKey) {
			// TODO: 快捷键功能待开发，篡改猴官方文档：https://www.tampermonkey.net/documentation.php#api:GM_registerMenuCommand
		}

		// 将菜单元素添加到菜单列表div中
		context.userMenusElement.append(menuElement);

		// 将菜单添加到菜单集合中
		context.menus[menuCmdId] = {
			name: name,
			callback: callback,
			options: options,
			element: menuElement
		};

		// 返回菜单ID
		return menuCmdId;
	};

	// 删除菜单
	api.GM_unregisterMenuCommand = (menuCmdId) => {
		if (menuCmdId == null) {
			return;
		}

		if (typeof menuCmdId !== "string") {
			menuCmdId = menuCmdId.toString();
		}

		if (menuCmdId.indexOf(MENU_ID_PRE) !== 0) {
			menuCmdId = MENU_ID_PRE + menuCmdId;
		}

		const menu = context.menus[menuCmdId];
		if (menu) {
			menu.element.remove();
			delete context.menus[menuCmdId];
		} else {
			const menuElement = document.getElementById(menuCmdId)
			if (menuElement) {
				menuElement.remove();
			}
		}
	};

	// 打开新标签
	api.GM_openInTab = (url, options_or_loadInBackground) => {
		// const options = typeof options_or_loadInBackground === "boolean"
		// 	? { loadInBackground: options_or_loadInBackground }
		// 	: (options_or_loadInBackground || {});

		window.open(url)
	};

	// 获取配置
	api.GM_getValue = (key, defaultValue) => {
		key = PRE + key;
		const valueStr = localStorage.getItem(key);
		if (valueStr == null || valueStr === '') {
			return defaultValue;
		}
		try {
			return JSON.parse(valueStr).v;
		} catch (e) {
		}
		return valueStr;
	};

	// 设置配置
	api.GM_setValue = (key, value) => {
		key = PRE + key;
		localStorage.setItem(key, JSON.stringify({ v: value }));
	};

	// 删除设置
	api.GM_deleteValue = (key) => {
		key = PRE + key;
		localStorage.removeItem(key);
	};

	// 通知
	api.GM_notification = (details_or_text, ondone_or_title, image, onclick) => {
		// param1
		let options = typeof details_or_text === "string" ? { text: details_or_text } : details_or_text;
		if (typeof options !== "object") {
			console.error(`ds_tampermonkey_${version}: GM_notification: 无效的参数值：details_or_text = ` + details_or_text);
			return;
		}
		// param2
		if (typeof ondone_or_title === "string") {
			options.title = ondone_or_title;
		} else if (typeof ondone_or_title === "function") {
			options.ondone = ondone_or_title;
		} else if (ondone_or_title != null) {
			console.warn(`ds_tampermonkey_${version}: GM_notification: 无效的参数值：ondone_or_title = ` + ondone_or_title);
		}
		// param3
		if (typeof image === "string") {
			options.image = image;
		} else if (image != null) {
			console.warn(`ds_tampermonkey_${version}: GM_notification: 无效的参数值：image = ` + image);
		}
		// param4
		if (typeof onclick === "function") {
			options.onclick = onclick;
		} else if (onclick != null) {
			console.warn(`ds_tampermonkey_${version}: GM_notification: 无效的参数值：onclick = ` + onclick);
		}

		// 显示通知方法
		const showNotification = () => {
			// 先关闭上一个通知
			api.closeLastNotification();

			// 获取标题和文本
			let text = options.text;
			let title = options.title;
			if (title == null) {
				title = text;
				text = null;
			} else {
				delete options.title;
			}
			delete options.text;


			// 创建通知属性
			const notificationOptions = {
				...options,
				icon: options.image || options.icon || (context.pluginOptions ? context.pluginOptions.icon : null) || icon
			};
			if (text) notificationOptions.body = text;
			// 创建通知
			const notification = new Notification(title, notificationOptions);
			// 将通知对象保存到context中
			const lastNotification = {
				obj: notification,
				options: options,
				timeout: null
			}
			context.lastNotification = lastNotification;
			// 设置点击通知事件
			if (options.onclick) {
				notification.onclick = () => options.onclick();
			}
			// 设置通知关闭事件
			if (typeof options.ondone === "function" || typeof options.onclose === "function") {
				notification.onclose = () => {
					// 执行回调方法
					if (typeof options.ondone === "function") {
						try {
							options.ondone();
						} catch (e) {
							console.error(`ds_tampermonkey_${version}: GM_notification: ondone回调函数执行失败：`, e);
						}
					}
					// 执行关闭方法
					if (typeof options.onclose === "function") {
						try {
							options.onclose();
						} catch (e) {
							console.error(`ds_tampermonkey_${version}: GM_notification: onclose关闭函数执行失败：`, e);
						}
					}
				}
			}
			// 设置定时关闭
			if (options.timeout) {
				lastNotification.timeout = setTimeout(() => {
					context.lastNotification = null;
					notification.close();
				}, options.timeout);
			}
			return notification;
		};
		// 当不支持Notification API，则使用alert显示通知
		const showAlert = () => {
			let text = options.text;
			if (options.title) {
				text = options.title + ": " + text;
			}

			alert(text);
			if (options.ondone) options.ondone(); // 回调
		};

		// 检查浏览器是否支持Notification API
		if (!("Notification" in window)) {
			showAlert(); // 不支持，直接使用alert显示通知
		}
		// 检查用户是否已授予权限
		else if (Notification.permission === "granted") {
			// 如果用户已授予权限，我们可以显示通知
			showNotification();
		}
		// 否则，先请求权限
		else if (Notification.permission !== 'denied') {
			Notification.requestPermission(function (permission) {
				if (permission === "granted") {
					showNotification(); // 用户接受权限，我们可以显示通知
				} else {
					showAlert(); // 用户驳回了权限，直接使用alert显示通知
				}
			});
		}
	};

	//endregion 篡改猴标准API，由DS自定义实现 end


	// 设置API
	window.__ds_global__ = api;

	// 模块化支持
	if (typeof module !== 'undefined') {
		module.exports = api;
	}

	console.log(`ds_tampermonkey_${version}: completed`)
})();