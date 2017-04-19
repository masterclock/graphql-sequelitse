"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const jsonType_1 = require("./types/jsonType");
exports.defaultListArgs = (model) => {
    return {
        limit: {
            type: graphql_1.GraphQLInt,
        },
        order: {
            type: graphql_1.GraphQLString,
        },
        where: {
            type: jsonType_1.JSONType,
            description: 'A JSON object conforming the the shape specified in ' +
                'http://docs.sequelizejs.com/en/latest/docs/querying/',
        },
        offset: {
            type: graphql_1.GraphQLInt,
        },
    };
};
//# sourceMappingURL=defaultListArgs.js.map