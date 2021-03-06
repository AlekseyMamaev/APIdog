/**
 * APIdog v6.5
 *
 * LongPoll server
 */

/**
 * Формат ответа от Proxy LongPoll Server:
 *
 * [
 * 	int status,
 *  object response,
 * 	object extra
 * ]
 *
 * status:
 * 	0 - удачный запрос
 * 	1 - vk: ошибка при получении адреса для сервера (captcha)
 * 	2 - vk: ошибка при получении адреса для сервера (vk)
 * 	3 - vk: ошибка при получении адреса для сервера (vk is down)
 *  4 - longpoll: пустой ответ
 *  5 - longpoll: ошибка парсинга ответа
 *  6 - longpoll: failed
 *  7 - longpoll: onError
 *
 * response:
 * 	int ts
 * 	array updates
 *
 * extra: свободный формат
 */

var http	= require("http"),
	https	= require("https"),
	url		= require("url"),
	query	= require("querystring"),

	server = http.createServer(function (request, response) {

		var requestData = url.parse(request.url),
			path = requestData.pathname,
			GET = query.parse(requestData.query),

			userAccessToken = GET.userAccessToken,
			captchaId = GET.captchaSid,
			captchaKey = GET.captchaKey;

		response.writeHead(200, {
			"Content-Type": "application/json; charset=utf-8",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Credentials": true,
			"Access-Control-Allow-Methods": "HEAD, OPTIONS, GET, POST",
			"Access-Control-Allow-Headers": "Content-Type, User-Agent, X-Requested-With, If-Modified-Since, Cache-Control"
		});
		if (!GET.ts && !GET.key && !GET.server) {
			getLongPollServer(response, userAccessToken, {id: captchaId, key: captchaKey});
		} else {
			waitForLongPoll(response, {ts: GET.ts, key: GET.key, server: GET.server});
		};
	}).listen(4000);

/**
 * Запрос адреса LongPoll-сервера
 * @param  {Object} response           Объект для ответа
 * @param  {String} userAccessToken    Пользовательский токен
 * @param  {Object} captcha            Данные капчи
 * @param  {Number} n                  Номер попытки
 */
function getLongPollServer(response, userAccessToken, captcha, n) {
	n = n || 0;

	var params = {
		v: 3,
		access_token: userAccessToken
	};

	if (captcha) {
		params.captcha_sid = captcha.id;
		params.captcha_key = captcha.key;
	};

	try {
		API("messages.getLongPollServer", params, function (data) {
			if (!data) {
				return n < 2 ? getLongPollServer(response, userAccessToken, captcha, ++n) : response.end();
			};

			if (!data.response) {
				if (data.error && data.error.error_code == 14) {
					return outputJSON(response, [1, null, {
						captchaId: data.error.captcha_sid,
						captchaImg: data.error.captcha_img
					}]);
				};
				return outputJSON(response, [2, null, { source: data.error } ] );
			};

			waitForLongPoll(response, data.response);
		}, response);
	} catch (e) {
		return outputJSON(response, [3, null, {  }]);
	};
};

/**
 * Висячий процесс запроса LongPoll
 * @param  {Object} response Объект для ответа
 * @param  {Object} data     Объект с данными для запроса
 */
function waitForLongPoll(response, data) {
	var url = data.server.split("/"),
		host = url[0],
		path = "/" + url[1] + "?act=a_check&wait=15&mode=66&key=" + data.key + "&ts=" + data.ts;

	http.get({
		host: host,
		port: 80,
		path: path
	}, function(result) {
		var json = new String();
		result.setEncoding("utf8");

		result.on("data", function(chunk) {
			json += chunk;
		});

		result.on("end", function() {
			if (!json) {
				return outputJSON(response, [4, null, { }]);
			};

			try {
				json = JSON.parse(json);
			} catch (e) {
				return outputJSON(response, [5, null, { reason: e.toString() }]);
			};

			if (json.failed) {
				return outputJSON(response, [6, null, { failed: json.failed }]);
			};

			outputJSON(response, [0, json, {server: data.server, key: data.key, ts: data.ts || json.ts}]);
		});
	}).on("error", function (e) {
		return outputJSON(response, [7, null, {}]);
	});
};

/**
 * Вывод ответа в JSON
 * @param  {Object} response Объект ответа
 * @param  {Object} data     Данные для вывода
 */
function outputJSON(response, data) {
	response.write(JSON.stringify(data));
	response.end();
};

/**
 * Запрос к API
 * @param {String}   method   Метод
 * @param {Object}   params   Параметры
 * @param {Function} callback Обработчик
 * @param {Object}   response Объект ответа
 */
function API(method, params, callback, response) {

	var options = {
		host: "api.vk.com",
		port: 443,
		path: "/method/" + method + "?" + buildHttpQuery(params),
		method: "GET"
	};

	https.get(options, function(res) {
		var apiResponse = new String();
		res.setEncoding("utf8");

		res.on("data", function(chunk) {
			apiResponse += chunk;
		});

		res.on("end", function () {
			try {
				apiResponse = JSON.parse(apiResponse);
				callback(apiResponse);
			} catch (e) {
				callback(null);
			};
		});
	}).on("error", function (e) {
		return outputJSON(response, [3, null, {}]);
	});
};

/**
 * Построение строки запроса
 * @param  {Object} data Параметры
 * @return {String}      Закодированная строка
 */
function buildHttpQuery (data) {
	var params = [];

	for (var item in data) {
		params.push(item + "=" + encodeURIComponent(data[item]));
	};

	return params.join("&");
};