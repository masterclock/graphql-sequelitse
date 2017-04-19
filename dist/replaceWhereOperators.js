"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function replaceKeyDeep(obj, keyMap) {
    return Object.keys(obj).reduce((memo, key) => {
        const targetKey = keyMap[key] ? keyMap[key] : key;
        memo[targetKey] = obj[key];
        if (Array.isArray(memo[targetKey])) {
            memo[targetKey].forEach((val, idx) => {
                if (Object.prototype.toString.call(val) === '[object Object]') {
                    memo[targetKey][idx] = replaceKeyDeep(val, keyMap);
                }
            });
        }
        else if (Object.prototype.toString.call(memo[targetKey]) === '[object Object]') {
            memo[targetKey] = replaceKeyDeep(memo[targetKey], keyMap);
        }
        return memo;
    }, {});
}
function replaceWhereOperators(where) {
    return replaceKeyDeep(where, {
        and: '$and',
        or: '$or',
        gt: '$gt',
        gte: '$gte',
        lt: '$lt',
        lte: '$lte',
        ne: '$ne',
        between: '$between',
        notBetween: '$notBetween',
        in: '$in',
        notIn: '$notIn',
        notLike: '$notLike',
        iLike: '$iLike',
        notILike: '$notILike',
        like: '$like',
        overlap: '$overlap',
        contains: '$contains',
        contained: '$contained',
        any: '$any',
        col: '$col',
    });
}
exports.replaceWhereOperators = replaceWhereOperators;
//# sourceMappingURL=replaceWhereOperators.js.map