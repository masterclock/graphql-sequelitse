"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const replaceWhereOperators_1 = require("./replaceWhereOperators");
function argsToFindOptions(args, targetAttributes) {
    const result = {};
    if (args) {
        Object.keys(args).forEach((key) => {
            if (!targetAttributes.indexOf(key)) {
                result.where = result.where || {};
                result.where[key] = args[key];
            }
            if (key === 'limit' && args[key]) {
                result.limit = parseInt(args[key], 10);
            }
            if (key === 'offset' && args[key]) {
                result.offset = parseInt(args[key], 10);
            }
            if (key === 'order' && args[key]) {
                if (args[key].indexOf('reverse:') === 0) {
                    result.order = [[args[key].substring(8), 'DESC']];
                }
                else {
                    result.order = [[args[key], 'ASC']];
                }
            }
            if (key === 'where' && args[key]) {
                result.where = replaceWhereOperators_1.replaceWhereOperators(args.where);
            }
        });
    }
    return result;
}
exports.argsToFindOptions = argsToFindOptions;
//# sourceMappingURL=argsToFindOptions.js.map