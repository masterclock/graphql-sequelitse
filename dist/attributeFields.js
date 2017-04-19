"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const graphql_relay_1 = require("graphql-relay");
const typeMapper_1 = require("./typeMapper");
exports.attributeFields = (Model, options = {}) => {
    const cache = options.cache || {};
    const result = Object.keys(Model.rawAttributes).reduce((memo, key) => {
        if (options.exclude) {
            if (typeof options.exclude === 'function' && options.exclude(key)) {
                return memo;
            }
            if (Array.isArray(options.exclude) && options.exclude.indexOf(key) >= 0) {
                return memo;
            }
        }
        if (options.only) {
            if (typeof options.only === 'function' && !options.only(key)) {
                return memo;
            }
            if (Array.isArray(options.only) && options.only.indexOf(key) < 0) {
                return memo;
            }
        }
        const attribute = Model.rawAttributes[key];
        const type = attribute.type;
        if (options.map) {
            if (typeof options.map === 'function') {
                key = options.map(key) || key;
            }
            else {
                key = options.map[key] || key;
            }
        }
        memo[key] = {
            type: typeMapper_1.toGraphQL(type, Model.sequelize.constructor),
        };
        if (memo[key].type instanceof graphql_1.GraphQLEnumType) {
            const typeName = `${Model.name}${key}EnumType`;
            if (cache[typeName]) {
                memo[key].type = cache[typeName];
            }
            else {
                memo[key].type.name = typeName;
                cache[typeName] = memo[key].type;
            }
        }
        if (!options.allowNull) {
            if (attribute.allowNull === false || attribute.primaryKey === true) {
                memo[key].type = new graphql_1.GraphQLNonNull(memo[key].type);
            }
        }
        if (options.commentToDescription) {
            if (typeof attribute.comment === 'string') {
                memo[key].description = attribute.comment;
            }
        }
        return memo;
    }, {});
    if (options.globalId) {
        result.id = graphql_relay_1.globalIdField(Model.name, (instance) => instance[Model.primaryKeyAttribute]);
    }
    return result;
};
//# sourceMappingURL=attributeFields.js.map