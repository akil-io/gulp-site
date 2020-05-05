module.exports = function () {
	let value, exclude, options;
	if (arguments.length == 2) {
		[value, options] = arguments;
		exclude = "()-";
	}
	if (arguments.length == 3) {
		[value, exclude, options] = arguments;
	}
	let filter = new RegExp("["+exclude.split("").map(i => `\\${i}`).join("")+"]", "ig");
	return value.replace(filter, "").split(" ").join("");
}