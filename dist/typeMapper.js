"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
let customTypeMapper;
function mapType(mapFunc) {
    customTypeMapper = mapFunc;
}
exports.mapType = mapType;
exports.toGraphQL = (sequelizeType, sequelizeTypes) => {
    if (customTypeMapper) {
        const result = customTypeMapper(sequelizeType);
        if (result) {
            return result;
        }
    }
    const { BOOLEAN, ENUM, FLOAT, CHAR, DECIMAL, DOUBLE, INTEGER, BIGINT, STRING, TEXT, UUID, DATE, DATEONLY, TIME, ARRAY, VIRTUAL, } = sequelizeTypes;
    const specialChars = /[^a-z\d_]/i;
    if (sequelizeType instanceof BOOLEAN) {
        return graphql_1.GraphQLBoolean;
    }
    if (sequelizeType instanceof FLOAT ||
        sequelizeType instanceof DOUBLE) {
        return graphql_1.GraphQLFloat;
    }
    if (sequelizeType instanceof INTEGER) {
        return graphql_1.GraphQLInt;
    }
    if (sequelizeType instanceof CHAR ||
        sequelizeType instanceof STRING ||
        sequelizeType instanceof TEXT ||
        sequelizeType instanceof UUID ||
        sequelizeType instanceof DATE ||
        sequelizeType instanceof DATEONLY ||
        sequelizeType instanceof TIME ||
        sequelizeType instanceof BIGINT ||
        sequelizeType instanceof DECIMAL) {
        return graphql_1.GraphQLString;
    }
    if (sequelizeType instanceof ARRAY) {
        const elementType = exports.toGraphQL(sequelizeType.type, sequelizeTypes);
        return new graphql_1.GraphQLList(elementType);
    }
    if (sequelizeType instanceof ENUM) {
        return new graphql_1.GraphQLEnumType({
            name: 'x',
            values: sequelizeType.values.reduce((obj, value) => {
                let sanitizedValue = value;
                if (specialChars.test(value)) {
                    sanitizedValue = value.split(specialChars).reduce((reduced, val, idx) => {
                        let newVal = val;
                        if (idx > 0) {
                            newVal = `${val[0].toUpperCase()}${val.slice(1)}`;
                        }
                        return `${reduced}${newVal}`;
                    });
                }
                obj[sanitizedValue] = { value };
                return obj;
            }, {}),
        });
    }
    if (sequelizeType instanceof VIRTUAL) {
        const returnType = sequelizeType.returnType
            ? exports.toGraphQL(sequelizeType.returnType, sequelizeTypes)
            : graphql_1.GraphQLString;
        return returnType;
    }
    throw new Error(`Unable to convert ${sequelizeType.key || sequelizeType.toSql()} to a GraphQL type`);
};
//# sourceMappingURL=typeMapper.js.map