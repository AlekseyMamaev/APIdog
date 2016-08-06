/**
 * APIdog v6.5
 *
 * Branch: dev
 * Progress: 20%
 */

function VKMessage (m) {
	m = m.message || m;
	this.messageId = m.id;
	this.peerId = m.user_id || m.from_id;
	this.userId = m.user_id;
	this.chatId = m.chat_id;
	this.groupId = m.from_id < 0 ? -m.from_id : false;
	this.peer = getPeerId(this);
	this.userId = m.user_id;
	this.date = m.date;
	this.title = m.title;
	this.text = m.body;
	this.geo = m.geo;
	this.attachments = m.attachments || [];
	this.forwardedMessages = m.fwd_messages;
	this.isRead = !!m.read_state;
	this.isOut = !!m.out;
	this.isImportant = !!m.important;

	this.photo_50 = m.photo_50;
	this.photo_100 = m.photo_100;
	this.photo_200 = m.photo_200;

	if (this.chatId && this.photo_50) {
		Mail.photosChats[this.chatId] = { p50: this.photo_50, p100: this.photo_100, p200: this.photo_200 };
	};
};

var APIDOG_DIALOG_PEER_USER = "u",
	APIDOG_DIALOG_PEER_CHAT = "c",
	APIDOG_DIALOG_PEER_GROUP = "g",
	APIDOG_DIALOG_PEER_CHAT_MAX_ID = 2000000000;

VKMessage.prototype = {

	getInfoFrom: function () {
		var f = this.peer, i = f[1], t;
		switch (f[0]) {
			case APIDOG_DIALOG_PEER_USER:
				t = Local.Users[i];
				return { photo: t.photo_100, name: getName(t) };

			case APIDOG_DIALOG_PEER_CHAT:
				return { photo: this.photo_100 || Mail.photosChats[this.chatId] && Mail.photosChats[this.chatId].p100, name: this.title };

			case APIDOG_DIALOG_PEER_GROUP:
				t = Local.Users[-i];
				return { photo: t.photo_100, name: t.name };
		};
		return {};
	},

	getDialogItemNode: function (o) {
		o = o || {};
		var e = $.e,
			unread = o.unread,

			fromId = this.peer.join(""),
			from = this.getInfoFrom();

		text = Site.Escape(this.text.replace(/\n/g, " "));
		text = text.length > 120 ? text.substring(0, 120) + "…" : text;
		text = Mail.Emoji(text);

		if (o.highlight) {
			text = text.replace(new RegExp("(" + o.highlight + ")", "igm"), "<span class='search-highlight'>$1<\/span>");
		};

		var link = e("a", {
			href: Mail.version && o.type != 3 ? "#im?to=" + fromId : "#mail?act=item&id=" + this.messageId,
			"data-count": parseInt(this.unread) || 0,
			"id": Mail.version ? "mail-dialog" + fromId : "mail-message" + this.messageId,
			"class": "selectfix dialogs-item" + (!this.isOut && !this.isRead ? " dialogs-item-new" : ""),
			append:
				e("div", {"class": "dialogs-item-wrap", append: [
					e("div", {style: "overflow: hidden;", append: [
						e("div", {"class": "dialogs-date", append: [
							this.isOut ? e("div", {"class": "dialogs-state" + (this.isRead ? " dialogs-state-readed" : "")}) : null,
							document.createTextNode($.getDate(this.date, 2))
						]}),
						e("img", {"class": "dialogs-left", src: from.photo ? getURL(from.photo) : Mail.defaultChatImage}),
						e("div", {"class": "dialogs-right", append:
							e("div", {append: [
								e("span", {"class": "tip", html: (this.peer[0] == APIDOG_DIALOG_PEER_CHAT ? Lang.get("mail.chat_noun") : "")}),
								e("strong", { html: Mail.Emoji(Site.Escape(from.name)) }),
								e("div", {"class": "n-f dialogs-text" + (this.isOut && !this.isRead ? " dialogs-new-message" : "") + (!this.isOut ? " dialogs-in" : ""), append: [
									e("div", {append: [
										e("span", {"class": "dialogs-unread", id: "ml" + fromId, html: unread || ""}),
										(this.isOut ? e("img", {src: getURL(API.photo_50), "class": "dialogs-miniphoto"}) : null),
										e("span", {html: (!this.action ? text : IM.getStringActionFromSystemVKMessage(this))})
									]}),
									e("div", {"class": "dialogs-attachments tip", html: Mail.getStringAttachments(this)})
								]})
							]})
						})
					]})
				]})
		});
		var attach, fwd;
		if (attach = Mail.getAttach())
		{
			$.event.add(link, "click", function (event)
			{
				if (!IM.attachs[to])
					IM.attachs[to] = [];
				IM.attachs[to].push(attach);
			});
		};

		return link;
	},

	getAttachmentNamesString: function () {
		return Mail.getStringAttachments(this);
	}

};

function getPeerId (msg) {
	var id = msg.userId;
	return isNaN(msg)
		? id < 0
			? ["g", -id]
			: msg.chatId
				? ["c", msg.chatId]
				: ["u", id]
			: msg < 0
				? ["g", -msg]
				: msg >= 2000000000
					? ["c", 2000000000 - msg]
					: ["u", msg];
};

function parsePeerId (pId) {
	return [pId[0], parseInt(pId.substring(1))];
};

function toPeerId (peer) {
	return {
		u: peer[1],
		g: -peer[1],
		c: 2000000000 + peer[1]
	}[peer[0]];
};

function getObjectByPeer (peer) {
	switch (peer[0]) {
		case APIDOG_DIALOG_PEER_USER: return Local.Users[peer[1]];
		case APIDOG_DIALOG_PEER_CHAT: return IM.chats[peer[1]];
		case APIDOG_DIALOG_PEER_GROUP: return Local.Users[-peer[1]];
		default: return null;
	};
};

var Mail = {

	version: 1, // 1 - dialogs, 0 - messages

	explain: function () {
		switch (Site.Get("act")) {
			case "item":
				return Mail.getMessageById(+Site.Get("id"));
				break;
			case "analyzes":
				window.location.hash = "#analyzes";
				break;
			case "analyzeDialog":
				window.location.hash = "#analyzes/dialog/" + Site.Get("id");
				break;
			case "stat":
				window.location.hash = "#analyzes/dialogs";
				break;
			case "search":
				Mail.search.page();
				break;
			case "chat":
				return Mail.createChat();
				break;
			default:
				Mail.page();
				var type = +Site.Get("type") || 0;
				if (Mail.version && type != 3)
					return Mail.getDialogs(0);
				else
					return Mail.getListMessages(type);
		};
	},

	page: function () {
		var parent = document.createElement("div"),
			list = document.createElement("div");
		parent.id = "_mail";
		list.id = "_mail-wrap";

		list.appendChild(Site.Loader(true));

		parent.appendChild(list);
		Site.Append(parent);
	},

	// refactored 15.01.2016: added support for dialogs with groups
	getDialogs: function (offset, node) {
		Site.API("execute", {
			code: 'var m=API.messages.getDialogs({count:40,offset:Args.o,preview_length:120,v:5.14}),q=m.items,w,i=0,l=q.length,g=[];while(i<l){w=q[i].message;if(w.user_id<0){g.push(-w.user_id);};i=i+1;};return{counters:API.account.getCounters(),dialogs:m,users:API.users.get({user_ids:m.items@.message@.user_id+m.items@.message@.source_mid,fields:"photo_100,online,sex"}),groups:API.groups.getById({group_ids:g})};',
			o: offset
		}, function (data) {
			data = Site.isResponse(data);
			Mail.showDialogs(data, offset);
			if (node) {
				$.elements.remove(node);
			};
		});
	},

	// updated 15.01.2016: added listeners onNewMessageReceived and onMessageReaded
	showDialogs: function (data, offset) {
		Local.add(data.users);
		Local.add(data.groups);
		var wrap = $.element("_mail-wrap"),
			counters = data.counters,
			data = data.dialogs,
			count = data.count,
			dialogs = data.items,
			page = document.createElement("div"),
			list = document.createElement("div");

		list.id = "mail-list";

		window.onNewMessageReceived = function (message) {
			var from = getPeerId(message).join(""),
				item = $.element("mail-dialog" + from),
				unreadCount = $.element("ml" + from) && +$.element("ml" + from).innerHTML || 0,
				parentNode;

			if (item) {
				parentNode = item.parentNode;
				$.elements.remove(item);
			} else {
				parentNode = $.element("mail-list");
			};
			if (!message.isOut) {
				unreadCount++;
			};

			IM.dialogsContent[from] ? IM.dialogsContent[from].unshift(message.messageId) : (IM.dialogsContent[from] = [message.messageId]);

			parentNode.insertBefore(message.getDialogItemNode({unread: unreadCount}), parentNode.firstChild);
		};

		window.onMessageReaded = function (messageId, peerId) {
			var p = getPeerId(peerId).join("");
			$.elements.addClass(document.querySelector("#mail-dialog" + p + " .dialogs-state"), "dialogs-state-readed");
			$.elements.removeClass($.element("mail-dialog" + p), "dialogs-item-new");
			$.element("ml" + p).innerHTML = "";
		};

		for (var i = 0, l = dialogs.length; i < l; ++i) {
			list.appendChild(Mail.item(dialogs[i]));
		};

		if (offset + dialogs.length + 50 < count + 50) {
			list.appendChild(Site.CreateNextButton({
				link: "#mail",
				text: Lang.get("im.next"),
				click: function (event) {
					$.event.cancel(event);
					if (this.disabled) return;
					Mail.getDialogs(offset + 40, this);
					this.disabled = true;
				}
			}));
		};

		if (!offset) {
			page.appendChild(Mail.getListMessagesTabs());
			page.appendChild(Site.CreateHeader(count + " " + Lang.get("mail", "dialogs", count), Mail.getActions()));
		};
		page.appendChild(list);
		Site.setCounters(counters);
		Site.SetHeader(Lang.get("mail.dialogs_noun"));

		if (!offset) {
			$.elements.clearChild(wrap);
		};

		wrap.appendChild(page);

	},

	photosChats: {},

	item: function (i, o) {

		return new VKMessage(i).getDialogItemNode(o);


	/*	var e = $.e,
			unread,
			user,
			to,
			text,
			delNode,
			cancelTap = false;
		o = o || {};
		unread = i.unread || o.unread || null;
		if (Mail.version && i.message)
			i = i.message;
		user = i.user_id > 0 ? Local.Users[i.user_id] : {last_name: "", first_name: ""};
		to = (i.chat_id ? -i.chat_id : i.user_id);

		if (to < 0 && i.photo_50)
			Mail.photosChats[to] = i.photo_50;

		i.photo_50 = i.photo_50 || Mail.photosChats[to];
		text = Site.Escape(i.body.replace(/\n/g, " ").replace(/\n/ig, " \\ "));
		text = text.length > 120 ? text.substring(0, 120) + ".." : text;
		text = Mail.Emoji(text);
		if (o.highlight)
			text = text.replace(new RegExp("(" + o.highlight + ")", "igm"), "<span class='search-highlight'>$1<\/span>");
		var link = e("a", {
			"href": Mail.version && Site.Get("type") != 3 ? "#im?to=" + to : "#mail?act=item&id=" + i.id,
			"data-count": parseInt(i.unread) || 0,
			"id": Mail.version ? "mail-dialog" + to : "mail-message" + i.id,
			"class": "selectfix dialogs-item" + (!i.out && !i.read_state ? " dialogs-item-new" : ""),
			append: e("div", {"class": "dialogs-item-wrap", append: [e("div", {style: "overflow: hidden;", append: [
				e("div", {"class": "dialogs-date", append: [
					i.out ? e("div", {"class": "dialogs-state" + (i.read_state ? " dialogs-state-readed" : "")}) : null,
					document.createTextNode($.getDate(i.date, 2))
				]}),
				e("img", {"class": "dialogs-left", src: (to < 0 ? (getURL(i.photo_50) || Mail.defaultChatImage) : getURL(user.photo_50))}),
				e("div", {"class": "dialogs-right", append: e("div", {append: [
					e("span", {"class": "tip", html: (to < 0 ? Lang.get("mail.chat_noun") : "")}),
					e("strong",{html: (to > 0 ? Site.Escape(user.first_name + " " + user.last_name) + " " + Site.isOnline(user) : Mail.Emoji(Site.Escape(i.title)))}),
					e("div", {"class": "n-f dialogs-text" + (i.out && !i.read_state ? " dialogs-new-message" : "") + (!i.out ? " dialogs-in" : ""), append:[
						e("div", {
							append: [
								e("span", {"class": "dialogs-unread", id: "ml" + to, html: unread || ""}),
								(i.out ? e("img", {src: getURL(API.photo_rec), "class": "dialogs-miniphoto"}) : null),
								e("span", {html: (user && to < 0 ? user.first_name + " " + user.last_name[0] + ".: " : "") + (!i.action ? text : IM.getStringActionFromSystemVKMessage(i))})
							]
						}),
						e("div", {"class": "dialogs-attachments tip", html: Mail.getStringAttachments(i)})
					]})
				]}) }) ]}),

			]})
		});
		var attach, fwd;
		if (attach = Mail.getAttach())
		{
			$.event.add(link, "click", function (event)
			{
				if (!IM.attachs[to])
					IM.attachs[to] = [];
				IM.attachs[to].push(attach);
			});
		};

		return link;*/
	},

	getAttach: function () {
		var a = String(Site.Get("attach")), b = /(photo|video|audio|doc|wall)(-?\d+)_(\d+)(_([\da-fA-F]+))?/img.exec(a), c = parseInt;
		return !b ? false : [b[1], c(b[2]), c(b[3]), b[5]];
	},

	// using in sticker-panel
	setTransform: function (node, value) {
		node.style.webkitTransform = value;
		node.style.mozTransform = value;
		node.style.msTransform = value;
		node.style.oTransform = value;
		node.style.transform = value;
	},

	DIALOGS_NODE_CLASS_ANIMATION_ON_SWIPE: "dialogs-item-swpiped",

	getRootItemNode: function (node) {
		var found;
		while (node.tagName.toLowerCase() != "a") {
			node = node.parentNode;
		}
		return node.firstChild;
	},

	getStringAttachments: function (msg) {
		if (msg.attachments && msg.attachments.length > 0 || msg.geo || msg.fwd_messages) {
			var attachs = {photos: 0, videos: 0, audios: 0, docs: 0, stickers: 0, map: 0, links: 0, walls: 0, fwds: 0, wall_replys: 0, gifts: 0},
				attachments = [];
			if (msg.attachments)
				for (var i = 0, l = msg.attachments.length; i < l; ++i)
					attachs[msg.attachments[i].type + "s"]++;
			if (msg.geo)
				attachs.map = 1;
			if (msg.fwd_messages)
				attachs.fwds = msg.fwd_messages.length;
			var attach_names = Lang.get("mail.attachment_names");
			for (var item in attach_names) { // какая-то неведомая хуйня. стикеры просто пролетают мимо с undefined.
				if (attachs[item] > 0)
					attachments.push((attachs[item] > 1 ? attachs[item] + " " : "") + $.TextCase(attachs[item], attach_names[item]));
			}
			if (attachs.stickers)
				attachments = [attach_names.stickers[0]];
			return attachments.join(", ");
		}
		return "";
	},

	defaultChatImage: "\/\/static.apidog.ru\/multichat-icon50.png",
	defaultEmojiTemplate: "<img src=\"\/\/vk.com\/images\/emoji\/%c_2x.png\" alt=\"%s\" class=\"emoji\" \/>",
	defaultEmojiTemplateProxy: "<img src=\"\/\/static.apidog.ru\/proxed\/smiles\/%c.png\" alt=\"%s\" class=\"emoji\" \/>",

	Emoji: function (s) {
		if (~navigator.userAgent.toLowerCase().indexOf("iphone"))
			return s;
		return s.replace(Mail.emojiRegEx, Mail.EmojiNewVK).replace(/\uFE0F/g, '');
	},

	EmojiNewVK: function(s){var i=0,b="",a="",n,y=[],c=[],d,l,o="",j=!1,f=!1;while(n=s.charCodeAt(i++)){d=n.toString(16).toUpperCase();l=s.charAt(i-1);if(i==2&&n==8419){c.push("003"+s.charAt(0)+"20E3");y.push(s.charAt(0));b='';a='';continue};b+=d;a+=l;if(!l.match(Mail.emojiCharSeq)){c.push(b);y.push(a);b='';a=''}};if(b){c.push(b);y.push(a)};b="";a="";for(var i in c){d=c[i];l=y[i];if(l.match(/\uD83C[\uDFFB-\uDFFF]/)){b+=d;a+=l;continue};if(j){b+=d;a+=l;j=!1;continue};if(d=="200C"||d=="200D"){if(b){j=!0;continue}else o+=l};if(l.match(/\uD83C[\uDDE6-\uDDFF]/)){if(f){b+=d;a+=l;f=!1;continue};f=!0;}else if(f)f=!1;if(b)o+=Mail.getEmojiHTML(b,a,!0);b=d;a=l};if(b)o+=Mail.getEmojiHTML(b,a,!0);return o},

	getEmojiHTML: function (code, symbol) {
		return (isEnabled(4) ? Mail.defaultEmojiTemplateProxy : Mail.defaultEmojiTemplate)
			.replace(/%c/g, code)
			.replace(/%s/g, symbol);
	},

	emojiCharSeq: /[0-9\uD83D\uD83C\uD83E]/,
	emojiRegEx: /((?:[\u2122\u231B\u2328\u25C0\u2601\u260E\u261d\u2626\u262A\u2638\u2639\u263a\u267B\u267F\u2702\u2708]|[\u2600\u26C4\u26BE\u2705\u2764]|[\u25FB-\u25FE]|[\u2602-\u2618]|[\u2648-\u2653]|[\u2660-\u2668]|[\u26A0-\u26FA]|[\u270A-\u2764]|[\uE000-\uF8FF]|[\u2692-\u269C]|[\u262E-\u262F]|[\u2622-\u2623]|[\u23ED-\u23EF]|[\u23F8-\u23FA]|[\u23F1-\u23F4]|[\uD83D\uD83C\uD83E]|[\uDC00-\uDFFF]|[0-9]\u20e3|[\u200C\u200D])+)/g,
	emojiFlagRegEx: /\uD83C\uDDE8\uD83C\uDDF3|\uD83C\uDDE9\uD83C\uDDEA|\uD83C\uDDEA\uD83C\uDDF8|\uD83C\uDDEB\uD83C\uDDF7|\uD83C\uDDEC\uD83C\uDDE7|\uD83C\uDDEE\uD83C\uDDF9|\uD83C\uDDEF\uD83C\uDDF5|\uD83C\uDDF0\uD83C\uDDF7|\uD83C\uDDF7\uD83C\uDDFA|\uD83C\uDDFA\uD83C\uDDF8/,



	EmojiOld: function (text)
	{
		return text.replace(/([\uE000-\uF8FF\u270A-\u2764\u2122\u25C0\u25FB-\u25FE\u2615\u263a\u2648-\u2653\u2660-\u2668\u267B\u267F\u2693\u261d\u26A0-\u26FA\u2708]|\uD83C[\uDC00-\uDFFF]|[\u2600\u26C4\u26BE\u23F3\u2764]|\uD83D[\uDC00-\uDFFF]|\uD83C[\uDDE8-\uDDFA]\uD83C[\uDDEA-\uDDFA]|[0-9]\u20e3)/g,
			function (symbol)
		{
			var i = 0,
				code = "",
				num;
			while (num = symbol.charCodeAt(i++))
			{
				if (i == 2 && num == 8419)
				{
					code = "003" + symbol.charAt(0) + "20E3";
					break;
				};
				code += num.toString(16);
			};
			code = code.toUpperCase();
			return (API.SettingsBitmask & 4 ? Mail.defaultEmojiTemplateProxy : Mail.defaultEmojiTemplate)
				.replace(/%c/g, code)
				.replace(/%s/g, symbol);
		}).replace(/\uFE0F/g, "");
	},


	getActions: function () {
		var p = {};
		p[Lang.get("mail.action_read_all")] = function (event) {
			var modal = new Modal({
				width: 395,
				title: "Подтверждение",
				content: "Вы уверены, что хотите отметить все сообщения прочитанными?<br/><small class=tip>Внимание! За раз эта функция отмечает только 24 диалога.</small>",
				footer: [
					{
						name: "yes",
						title: "Да",
						onclick: function () {
							modal.close();
							Mail.requestReadAll();
						}
					},
					{
						name: "close",
						title: "Нет",
						onclick: function () {
							modal.close();
						}
					}
				]
			}).show();
		};

		p[Lang.get(Mail.version ? "mail.action_switch_to_messages" : "mail.action_switch_to_dialogs")] = function (event) {
			Mail.version = +!Mail.version;
			Mail.explain();
		};

		p[Lang.get("mail.action_create_chat")] = function (event) {
			window.location.hash = "#mail?act=chat";
		};

		p[("!<input type=\"checkbox\" %s onchange='Mail.setAutoRead(this);' \/><span> " + Lang.get("settings.param_autoread") + "<\/span>").replace(/%s/ig, API.SettingsBitmask & 2 ? "checked" : "")] = function (event) {event.stopPropagation()};
		return Site.CreateDropDownMenu(Lang.get("general.actions"), p);
	},

	setAutoRead: function (node) {
		API.SettingsBitmask += node.checked ? (API.SettingsBitmask & 2 ? 0 : 2) : (API.SettingsBitmask & 2 ? -2 : 0);
		Settings.fastSaveSettings(API.SettingsBitmask);
	},

	requestReadAll: function (readed) {
		Site.API("execute", {
			code: 'var m=API.messages.getDialogs({unread:1,count:19,v:5.16}),c=m.count,i=0,m=m.items,q;while(i<m.length){if(m[i].message.chat_id){q={peer_id:2000000000+m[i].message.chat_id};}else{q={peer_id:m[i].message.user_id};};API.messages.markAsRead(q);i=i+1;};return{n:c-19,r:%r%+i};'.replace(/%r%/ig, readed || 0)
		}, function (data) {
			data = data.response;
			if (data.n > 0)
				return Mail.requestReadAll(data.r);

			data = data.r;

			if (isNaN(data))
				return;


			Site.Alert({text: data + " " + $.textCase(data, Lang.get("mail.dialog_was_readed"))});
		})
	},

	deletedMessage: false,

	getListMessages: function (type) {
		var params = [
				'"out":0', // inbox
				'"out":1', // outbox
				'"out":0,"filters":1', // new
				'"filters":8' // important
			][type],
			offset = +Site.Get("offset");
		Site.API("execute", {
			code: 'var m=API.messages.get({preview_length:110,count:40,v:5.8,offset:%o%,%r%});return {mail:m,users:API.users.get({user_ids:m.items@.user_id,v:5.8,fields:"photo_50,online,screen_name,sex"})};'
				.replace(/%o%/ig, offset)
				.replace(/%r%/ig, params)
		}, function (data) {
			data = Site.isResponse(data);
			Local.AddUsers(data.users);
			Mail.showListMessages(data.mail, {type: type});
		});
	},

	getListMessagesTabs: function () {
		return Site.CreateTabPanel(!Mail.version ? [
			["mail", Lang.get("mail.tabs_inbox")],
			["mail?type=1", Lang.get("mail.tabs_outbox")],
			["mail?type=2", Lang.get("mail.tabs_new")],
			["mail?type=3", Lang.get("mail.tabs_important")],
			["mail?act=search", Lang.get("mail.tabs_search")],
			["analyzes", "Анализатор"]
		] : [
			["mail", Lang.get("mail.tabs_dialogs")],
			["mail?type=3", Lang.get("mail.tabs_important")],
			["mail?act=search", Lang.get("mail.tabs_search")],
			["analyzes", "Анализатор"]
		]);
	},

	showListMessages: function (data, options) {
		options = options || {};
		var parent = document.createElement("div"),
			list = document.createElement("div"),
			count = data.count,
			items = data.items;

		list.id = "mail-list";

		parent.appendChild(Mail.getListMessagesTabs());

		var words = Lang.get("mail.types_messages");

		parent.appendChild(Site.CreateHeader(formatNumber(count) + " " + $.TextCase(count, words[options.type]), Mail.getActions()));

		if (Mail.deletedMessage) {
			var deleted_message_id = Mail.deletedMessage, notification;
			list.appendChild(notification = $.elements.create("div", {"class": "photo-deleted", append: [
				document.createTextNode(Lang.get("mail.message_id_deleted").replace(/%i%/ig, deleted_message_id)),
				$.elements.create("span", {"class": "a", html: Lang.get("mail.message_restore"), onclick: function (event) {
					Site.API("messages.restore", {message_id: deleted_message_id}, function (data) {
						if (!data.response)
							return Site.Alert({text: Lang.get("mail.failed_restore")});
						$.elements.remove(notification);
						Site.Alert({text: Lang.get("mail.success_restore"), click: function (event) {
							window.location.hash = "#mail?act=item&id=" + deleted_message_id;
						}})
					});
				}})
			]}))
			Mail.deletedMessage = false;
		}

		if (count)
			for (var i = 0, l = items.length; i < l; ++i)
				list.appendChild(Mail.item(items[i], {}));
		else
			list.appendChild(Site.EmptyField(Lang.get("mail.you_havent") + (Lang.get("mail.you_havent_by_types")[options.type])))

		parent.appendChild(list);
		parent.appendChild(Site.PagebarV2(Site.Get("offset"), count, 40));

		Site.Append(parent);
		Site.SetHeader(Lang.get("mail.messages"));
	},

	getMessageById: function (data) {
		if (typeof data === "number") {
			var parent = arguments.callee;
			return Site.API("execute", {
				code: 'var m=API.messages.getById({message_ids:%i%,v:5.8}).items[0],i=(m.fwd_messages@.user_id);i.push(m.user_id);var u=API.users.get({user_ids:i,fields:"%f%",v:5.8});%r%return {message:m,users:u};'
					.replace(/%i%/ig, data)
					.replace(/%f%/ig, "photo_50,screen_name,online,can_write_private_message,first_name_gen,last_name_gen,sex")
					.replace(/%r%/ig, API.SettingsBitmask & 2 ? "API.messages.markAsRead({message_ids:m.id});" : ""),
			}, function (data) {
				data = Site.isResponse(data);

				Local.AddUsers(data.users);

				parent(data.message);
			})
		}
		var parent = document.createElement("div"),
			to = data.chat_id ? -data.chat_id : data.user_id,
			message_id = data.id,
			actions = {
				openDialog: function (event) {
					Mail.findOffsetByMessageId(message_id, Math.abs(to), data.chat_id ? "chat_id" : "user_id", function (offset) {
						window.location.hash = "#im?to=" + to + "&force=1&offset=" + offset + "&messageId=" + message_id;
					});
				},
				forwardMessage: function (event) {
					IM.forwardMessagesIds = [message_id];
					window.location.hash = "#mail";
				},
				markAsImportant: function (event) {
					var field = this;
					Site.API("messages.markAsImportant", {
						message_ids: message_id,
						important: +!data.important
					}, function (result) {
						if (!result.response)
							return;
						Site.Alert({text: Lang.get("mail.message_success_marked_as") + (!data.important ? Lang.get("mail.message_important") : Lang.get("mail.message_unimportant"))});
						data.important = !data.important;
						field.value = data.important ? Lang.get("mail.mark_as_unimportant") : Lang.get("mail.mark_as_important");
					});
				},
				deleteMessage: function (event) {
					if (!confirm(Lang.get("mail.confirm_delete_message")))
						return;

					Site.API("messages.delete", {message_ids: message_id}, function (data) {
						if (!data.response)
							return;

						Site.Alert({text: Lang.get("mail.success_deleted")});
						Mail.deletedMessage = message_id;
						window.location.hash = "#mail" + (data.out ? "?type=1" : "");
					})
				}
			},
			e = $.elements.create,
			user = Local.Users[data.user_id];

		parent.appendChild(Site.CreateHeader(Lang.get("mail.message_id") + message_id));

		parent.appendChild(e("div", {"class": "friends-item", append: [
			e("img", {"class": "friends-left", src: getURL(user.photo_50)}),
			e("div", {"class": "mail-head friends-right", append: [
				e("div", {html: (data.out && to > 0 ? Lang.get("mail.message_for") + " <a href='#" + user.screen_name + "'>" + user.first_name_gen + " "+user.last_name_gen + Site.isOnline(user) + "<\/a>" : (to > 0 ? Lang.get("mail.message_from") + " <a href='#" + user.screen_name + "'>" + user.first_name_gen + " " + user.last_name_gen + Site.isOnline(user) + "<\/a>" : Lang.get("mail.message_from_chat") + " &laquo;" + data.title + "&raquo; " + Lang.get("mail.message_from_chat_from") + " <a href='#" + user.screen_name + "'>" + user.first_name_gen + " " + user.last_name_gen + Site.isOnline(user) + "<\/a>"))}),
						e("div", {"class": "tip", html: $.getDate(data.date)})
					]})
				]
			}));

		var text = e("div",{"class": "n-f", html: Mail.Emoji(Site.Format(Site.Escape(data.body)))});
		text.style.whiteSpace = "";
		parent.appendChild(e("div", {"class": "mail-content-item", append: [
			text,
			Site.Attachment(data.attachments, "mail" + message_id),
			IM.forwardedMessages(data.fwd_messages)
		]}));
		actions = [
			[actions.openDialog, Lang.get("mail.message_open_dialog")],
			[actions.forwardMessage, Lang.get("mail.message_forward")],
			[actions.markAsImportant, Lang.get("mail.message_mark") + (!data.important ? Lang.get("mail.message_important") : Lang.get("mail.message_unimportant"))],
			[actions.deleteMessage, Lang.get("mail.message_delete")]
		];
		for (var i = 0, l = actions.length; i < l; ++i) {
			actions[i] = e("input", {type: "button", value: actions[i][1], onclick: actions[i][0]});
		}
		parent.appendChild(e("div", {"class": "mail-actions", append: actions}));
		parent.appendChild(Site.CreateHeader("Ответить"));
		parent.appendChild(Site.CreateWriteForm({
			nohead: true,
			ctrlEnter: true,
			name: "message",
			allowAttachments: 30,
			onsubmit: function (event) {
				var text = $.trim(this.message.value),
					attachments = $.trim(this.message.value),
					field = this.message;
				if(!text) {
					Site.Alert({
						text: "Введите сообщение!",
						click: function (event) {
							field.focus();
						}
					});
					return false;
				}
				var opts = {message: text, attachments: attachments};
				if (to > 0)
					opts.user_id = to;
				else
					opts.chat_id = -to;
				Site.API("messages.send", opts, function (data) {
					if (data.response) {
						window.location.hash="#mail";
						Site.Alert({text: "Сообщение успешно отправлено!"});
					}
				});
				return false;
			}
		}, 0, 0));

		Site.SetHeader(Lang.get("mail.message"), {link: "mail" + (data.out ? "?type=1" : "")});
		Site.Append(parent);
	},

	search: {
		page: function () {
			var parent = document.createElement("div"),
				list = document.createElement("div"),
				e = $.elements.create, q;

			if (q = Site.Get("q")) {
				Mail.search.onSubmit(q, Site.Get("type"));
			};


			list.id = "__mail-search-list";
			parent.appendChild(Mail.getListMessagesTabs());
			parent.appendChild(Site.CreateHeader(Lang.get("mail.search"), e("span", {id: "__mail-search-count", "class": "fr"})));
			parent.appendChild(Mail.search.getForm());
			parent.appendChild(list);
			Site.Append(parent);
			Site.SetHeader(Lang.get("mail.search"));
		},
		form: null,
		getForm: function () {
			if (Mail.search.form)
				return Mail.search.form;

			var form = Site.CreateInlineForm({
					type: "search",
					name: "q",
					value: decodeURIComponent(Site.Get("q") || ""),
					placeholder: Lang.get("mail.search_query"),
					title: Lang.get("mail.search"),
					onsubmit: function (event) {
						event.preventDefault();
						window.location.hash = "#mail?act=search&type=" + this.where.options[this.where.selectedIndex].value + "&q=" + encodeURIComponent(this.q.value.trim());
						return false;
					}
				}),
				e = $.elements.create;
			form.appendChild(e("div", {"class": "sf-wrap", append: [
				e("select", {name: "where", append: [
					e("option", {value: 1, html: Lang.get("mail.search_by_dialogs")}),
					e("option", {value: 0, html: Lang.get("mail.search_by_messages"), selected: true})
				]})
			]}));
			return Mail.search.form = form;
		},
		onSubmit: function (q, type) {
			Site.API(
				["execute", "messages.searchDialogs"][type],
				[{
					code: 'var m=API.messages.search({q:"%q%",preview_length:120,count:40,offset:%o%,v:5.8});return {messages:m,users:API.users.get({user_ids:m.items@.user_id,fields:"%f%",v:5.8})};'
						.replace(/%q%/ig, decodeURIComponent(q))
						.replace(/%o%/ig, +Site.Get("offset"))
						.replace(/%f%/ig, "photo_50,online,screen_name")
				}, {
					q: decodeURIComponent(q),
					limit: 16,
					fields: "photo_50,online,screen_name,sex",
					v: 5.8
				}][type],
				function (data) {
					Mail.search.getResult(data.response, type, {q: q})
				}
			)

			return false;
		},
		getResult: function (data, type, options) {
			options = options || {};
			if (!data) {
				return Site.Alert({text: Lang.get("mail.unknown_error")});
			}
			if (type == 0) {
				Local.AddUsers(data.users);
				data = data.messages;
			}
			var item = [
				function (i) {
					var node = Mail.item(i, {highlight: options.q});
					node.href = "#mail?act=item&id=" + i.id;
					return node;
				}, function (i) {
					console.log(i);
					var e = $.elements.create;
					return e("a", {"class": "miniprofiles-item", href: "#im?to=" + (i.admin_id ? -i.id : i.id), append: [
						e("img", {"class": "miniprofiles-left", src: i.photo_50 ? getURL(i.photo_50) : Mail.DEFAULT_CHAT_IMAGE}),
						e("div", {"class": "miniprofiles-right", html: {profile: i.first_name + " " + i.last_name + Site.isOnline(i), chat: i.title, email: i.email}[i.type]})
					]})
				}][type],
				founded = document.createElement("div"),
				items = [data.items, data][type];

			for (var i = 0, l = items.length; i < l; ++i)
				founded.appendChild(item(items[i]));

			$.element("__mail-search-count").innerHTML = data.count ? Lang.get("mail.search_founded") + data.count + " " + $.TextCase(data.count, Lang.get("mail.search_messages")) : "";
			var list = $.element("__mail-search-list");
			$.elements.clearChild(list);
			list.appendChild(founded);
			if (data.count)
				list.appendChild(Site.PagebarV2(Site.Get("offset"), data.count, 40));
		}
	},

	findOffsetByMessageId: function (messageId, peerId, peerType, callback) {
		var offset = 0,
			isFound = false,
			code,
			active = true,
			stoppedByUser = false,
			modal = new Modal({
				title: "Поиск сообщения..",
				content: "Ищу место в диалоге, это может занять некоторое время..",
				footer: [
					{
						name: "cancel",
						title: "Отмена",
						onclick: function () {
							cancel();
							modal.close();
						}
					}
				]
			}).show(),
			request = function () {
				code = "var o=%o,i=0,l=25,d=[],s=200;while(i<l){d=d+API.messages.getHistory({%t:%p,offset:o+(s*i),count:s,v:5.28}).items@.id;i=i+1;};return d;".schema({t: peerType, o: offset, i: messageId, p: peerId});
				console.log(code);
				Site.API("execute", {
					code: code
				}, function (data) {
					data = Site.isResponse(data);

					for (var i = 0, l = data.length; i < l; ++i) {
						if (data[i] == messageId) {
							onFound(offset + i);
							break;
						};
					};

					if (data.length != 0) {
						if (active) {
							offset += data.length;
							setTimeout(request, 350);
						} else if (!stoppedByUser) {
							modal
								.setTitle("Хм..")
								.setContent("Странно.. Сообщение не нашлось в этом диалоге")
								.setButton("cancel", {
									name: "close",
									title: "Закрыть",
									onclick: function () { modal.close() }
								});
						};
					};
				});
			},
			cancel = function () {
				active = false;
				stoppedByUser = true;
				modal.close();
			},
			onFound = function (offset) {
				if (stoppedByUser) return;
				active = false;
				isFound = true;
				modal.close();
				callback(parseInt(offset / 50) * 50);
			};
		request();
	},


	DEFAULT_CHAT_IMAGE: "\/\/static.apidog.ru\/multichat-icon50.png",

	getMaterialLoader: function (o)
	{
		o = o || {};
		var e = $.e, node;
		node = e("div",
		{
			"class": "loader-wrap",
			append: e("div",
			{
				"class": "md",
				style: "margin: 0 auto 10px;",
				append: e("div",
				{
					"class": "md-spinner-wrapper",
					append: e("div",
					{
						"class": "md-inner",
						append: [
							e("div", {"class": "md-gap"}),
							e("div", {"class": "md-left", append: e("div", {"class": "md-half-circle"})}),
							e("div", {"class": "md-right", append: e("div", {"class": "md-half-circle"})})
						]
					})
				})
			})
		});
		return o.wrapClass ? e("div", {"class": o.wrapClass, append: node}) : node;
	},

	createChat: function () {

		if (!Friends.friends[API.uid]) {
			Site.APIv5("friends.get", {
				fields: "online,photo_50,sex,bdate,screen_name,can_write_private_message,city,country",
				v: 5.8,
				order: "hints"
			}, function (data) {
				data = Site.isResponse(data);
				Friends.friends[API.uid] = data;
				Mail.createChat();
			});
			return;
		}

		var e = $.e,
			parent = e("div"),
			form = e("form", {onsubmit: Mail.onSubmitCreateChat}),
			title = e("div", {"class": "sf-wrap"}),
			status = e("div", {"class": "tip tip-form"}),
			creater = e("input", {
				type: "submit",
				value: Lang.get("mail.create_creator"),
				"class": "mail-create-btn",
				disabled: true
			}),
			selected = 0,
			setStatus = function () {
				creater.disabled = (selected <= 1 || !$.trim(name.value));
				status.innerHTML = Lang.get("mail", "create_status", selected).replace(/%n/img, selected);
			},
			name = e("input", {type: "text", required: true, name: "title", onkeyup: setStatus}),
			item = function (item) {
				return e("label", {
					"class": "miniprofiles-item",
					onclick: function (event) {
						var check = form.querySelectorAll("input[type=checkbox]:checked");
						selected = check.length;
						if (selected >= 30)
							$.event.cancel(event);
						if (this.querySelector("input[type=checkbox]").checked)
							$.elements.addClass(this, "mp-checked");
						else
							$.elements.removeClass(this, "mp-checked");
						setStatus();
					},
					append: [
						e("img", {"class": "miniprofiles-left", src: getURL(item.photo_50 || item.photo_rec)}),
						e("div", {"class": "_checkbox fr"}),
						e("input", {"class": "multiple_friends hidden", type: "checkbox", name: "items[]", value: item.id || item.uid}),
						e("div", {"class": "miniprofiles-right", append: e("strong", {
							append: e("a", {
								href: "#" + (item.screen_name || "id" + (item.id || item.uid)),
								onclick: function (event) { $.event.cancel (event) },
								html: item.first_name + " " + item.last_name
							})
						})})
					]
				})
			},
			list = e("div");

		title.appendChild(e("div", {"class": "tip tip-form", html: Lang.get("mail.create_title")}));
		title.appendChild(name);
		title.appendChild(creater);
		title.appendChild(status);

		for (var i = 0, f = Friends.friends[API.uid].items, l = f.length; i < l; ++i)
			list.appendChild(item(f[i]));

		form.appendChild(title);
		form.appendChild(list);
		parent.appendChild(Site.CreateHeader(Lang.get("mail.create_header")))
		parent.appendChild(form);
		Site.Append(parent);
		Site.SetHeader(Lang.get("mail.create_header"), {link: "mail"});
		setStatus();
	},

	onSubmitCreateChat: function (event) {
		$.event.cancel(event);

		var title = $.trim(this.title.value),
			checked = this.querySelectorAll("input[type=checkbox]:checked"),
			userIds = [];

		for (var i = 0, l = checked.length > 30 ? 30 : checked.length; i < l; ++i)
			userIds.push(checked[i].value);

		userIds = userIds.join(",");

		Site.API("messages.createChat", {title: title, user_ids: userIds}, function (data) {
			data = Site.isResponse(data);
			if (!data)
				return Site.Alert({text: data.error || data.error_msg});

			window.location.hash = "#im?to=-" + data;
		});

		return false;
	}
};