import * as typeMapper from './typeMapper';
import { JSONType } from './types/jsonType';

export const defaultArgs = (model: any) => {
  const result: any = {};
  const key = model.primaryKeyAttribute;
  const attribute = model.rawAttributes[key];
  let type;

  if (key && attribute) {
    type = typeMapper.toGraphQL(attribute.type, model.sequelize.constructor);
    result[key] = {
      type: type,
    };
  }

  // add where
  result.where = {
    type: JSONType,
    description: 'A JSON object conforming the the shape specified in' +
      'http://docs.sequelizejs.com/en/latest/docs/querying/',
  };

  return result;
};
