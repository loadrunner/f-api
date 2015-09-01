/**
 * Return a unique identifier with the given `len`.
 *
 *     utils.uid(10);
 *     // => "FDaS435D2z"
 *
 * @param {Number} len
 * @return {String}
 * @api private
 */
exports.uid = function(len) {
  var buf = []
    , chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    , charlen = chars.length;

  for (var i = 0; i < len; ++i) {
    buf.push(chars[getRandomInt(0, charlen - 1)]);
  }

  return buf.join('');
};

/**
 * Return a random int, used by `utils.uid()`
 *
 * @param {Number} min
 * @param {Number} max
 * @return {Number}
 * @api private
 */

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.parseSort = function (param, allowed, defaults) {
	if (!param)
		return defaults;
	
	var sort = {};
	var params = param.split(',');
	params.forEach(function (param) {
		var sign = 1;
		if (param.charAt(0) == '-') {
			sign = -1;
			param = param.substr(1)
		} else if (param.charAt(0) == '+') {
			sign = 1;
			param = param.substr(1)
		}
		
		if (param && allowed.indexOf(param) >= 0) {
			sort[param] = sign;
		}
	});
	
	if (sort)
		return sort;
	else
		return defaults;
}