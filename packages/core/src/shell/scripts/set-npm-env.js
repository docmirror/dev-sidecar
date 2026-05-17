/**
 * 设置环境变量
 */
const Shell = require("../shell");

const execute = Shell.execute;

const executor = {
	async windows(exec, { list }) {
		const cmds = [];
		for (const item of list) {
			cmds.push(`npm config set ${item.key}  ${item.value}`);
		}
		return await exec(cmds, { type: "cmd" });
	},
	async linux(_exec, { port: _port }) {
		throw new Error("暂未实现此功能");
	},
	async mac(_exec, { port: _port }) {
		throw new Error("暂未实现此功能");
	},
};

module.exports = async (args) => execute(executor, args);
