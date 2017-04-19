"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const language_1 = require("graphql/language");
const astToJson = {
    [language_1.Kind.INT](ast) {
        return graphql_1.GraphQLInt.parseLiteral(ast);
    },
    [language_1.Kind.FLOAT](ast) {
        return graphql_1.GraphQLFloat.parseLiteral(ast);
    },
    [language_1.Kind.BOOLEAN](ast) {
        return graphql_1.GraphQLBoolean.parseLiteral(ast);
    },
    [language_1.Kind.STRING](ast) {
        return graphql_1.GraphQLString.parseLiteral(ast);
    },
    [language_1.Kind.ENUM](ast) {
        return String(ast.value);
    },
    [language_1.Kind.LIST](ast) {
        return ast.values.map((astItem) => {
            return exports.JSONType.parseLiteral(astItem);
        });
    },
    [language_1.Kind.OBJECT](ast) {
        const obj = {};
        ast.fields.forEach((field) => {
            obj[field.name.value] = exports.JSONType.parseLiteral(field.value);
        });
        return obj;
    },
};
exports.JSONType = new graphql_1.GraphQLScalarType({
    name: 'SequelizeJSON',
    description: 'The `JSON` scalar type represents raw JSON as values.',
    serialize: (value) => value,
    parseValue: (value) => value,
    parseLiteral: (ast) => {
        const parser = astToJson[ast.kind];
        return parser ? parser.call(this, ast) : null;
    },
});
//# sourceMappingURL=jsonType.js.map