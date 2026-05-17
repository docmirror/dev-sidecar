/**
 * 获取环境变量
 */
const Shell = require("../shell");

const execute = Shell.execute;

const executor = {
	async windows(exec) {
		const ret = await exec(["set"], { type: "cmd" });
		const map = {};
		if (ret != null) {
			const lines = ret.split("\r\n");
			for (const item of lines) {
				const kv = item.split("=");
				if (kv.length > 1) {
					map[kv[0].trim()] = kv[1].trim();
				}
			}
		}
		return map;
	},
	async linux(_exec, { port: _port }) {
		throw new Error("暂未实现此功能");
	},
	async mac(_exec, { port: _port }) {
		throw new Error("暂未实现此功能");
	},
};

module.exports = async (args) => execute(executor, args);
