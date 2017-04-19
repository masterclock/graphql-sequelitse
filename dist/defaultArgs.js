"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeMapper = require("./typeMapper");
const jsonType_1 = require("./types/jsonType");
exports.defaultArgs = (model) => {
    const result = {};
    const key = model.primaryKeyAttribute;
    const attribute = model.rawAttributes[key];
    let type;
    if (key && attribute) {
        type = typeMapper.toGraphQL(attribute.type, model.sequelize.constructor);
        result[key] = {
            type: type,
        };
    }
    result.where = {
        type: jsonType_1.JSONType,
        description: 'A JSON object conforming the the shape specified in' +
            'http://docs.sequelizejs.com/en/latest/docs/querying/',
    };
    return result;
};
//# sourceMappingURL=defaultArgs.js.map