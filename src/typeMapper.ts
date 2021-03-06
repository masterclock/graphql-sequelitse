import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLString,
} from 'graphql';

let customTypeMapper: any;
/**
 * A function to set a custom mapping of types
 * @param {Function} mapFunc
 */
export function mapType(mapFunc: any) {
  customTypeMapper = mapFunc;
}

/**
 * Checks the type of the sequelize data type and
 * returns the corresponding type in GraphQL
 * @param  {Object} sequelizeType
 * @param  {Object} sequelizeTypes
 * @return {Function} GraphQL type declaration
 */
export const toGraphQL = (sequelizeType: any, sequelizeTypes: any): any => {

  // did the user supply a mapping function?
  // use their mapping, if it returns truthy
  // else use our defaults
  if (customTypeMapper) {
    const result = customTypeMapper(sequelizeType);
    if (result) {
      return result;
    }
  }

  const {
    BOOLEAN,
    ENUM,
    FLOAT,
    CHAR,
    DECIMAL,
    DOUBLE,
    INTEGER,
    BIGINT,
    STRING,
    TEXT,
    UUID,
    DATE,
    DATEONLY,
    TIME,
    ARRAY,
    VIRTUAL,
  } = sequelizeTypes;

  // Regex for finding special characters
  const specialChars = /[^a-z\d_]/i;

  if (sequelizeType instanceof BOOLEAN) {
    return GraphQLBoolean;
  }

  if (sequelizeType instanceof FLOAT ||
    sequelizeType instanceof DOUBLE) {
    return GraphQLFloat;
  }

  if (sequelizeType instanceof INTEGER) {
    return GraphQLInt;
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
    return GraphQLString;
  }

  if (sequelizeType instanceof ARRAY) {
    const elementType = toGraphQL(sequelizeType.type, sequelizeTypes);
    return new GraphQLList(elementType);
  }

  if (sequelizeType instanceof ENUM) {
    return new GraphQLEnumType({
      name: 'x',
      values: sequelizeType.values.reduce((obj: any, value: any) => {
        let sanitizedValue = value;
        if (specialChars.test(value)) {
          sanitizedValue = value.split(specialChars).reduce((reduced: any, val: any, idx: any) => {
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
      ? toGraphQL(sequelizeType.returnType, sequelizeTypes)
      : GraphQLString;
    return returnType;
  }

  throw new Error(`Unable to convert ${sequelizeType.key || sequelizeType.toSql()} to a GraphQL type`);

};
