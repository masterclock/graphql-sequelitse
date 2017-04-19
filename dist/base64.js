"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.base64 = (i) => {
    return (new Buffer(i, 'ascii')).toString('base64');
};
exports.unbase64 = (i) => {
    return (new Buffer(i, 'base64')).toString('ascii');
};
//# sourceMappingURL=base64.js.map